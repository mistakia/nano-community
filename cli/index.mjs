#!/usr/bin/env node

import crypto from 'crypto'
import { readFileSync, realpathSync } from 'fs'
import process from 'process'
import { fileURLToPath } from 'url'
import { parseArgs } from 'util'

import collect_host_hardware from './collect-host-hardware.mjs'
import { ask, ask_hidden, close_prompts, confirm } from './prompt.mjs'
import {
  encode_nano_account,
  get_public_key,
  sign_message
} from './sign-message.mjs'

// Every signed message goes here. The published bin has no setting that
// changes it; only a caller importing main, as the tests do, can.
const API_URL = 'https://nano.community'
const REQUEST_TIMEOUT_MS = 20000
const MAX_RESPONSE_BYTES = 1024 * 1024
const HEX_64_RE = /^[0-9a-f]{64}$/

// The published bin cannot import the repo's #common, so it carries its own
// isMain. Resolving both sides keeps an npm-bin symlink invocation main.
const isMain = (import_meta_url) => {
  if (!process.argv[1]) return false
  try {
    return (
      realpathSync(process.argv[1]) ===
      realpathSync(fileURLToPath(import_meta_url))
    )
  } catch {
    return false
  }
}

// Characters that could reorder, hide or disguise part of what is shown: C1
// controls, format characters (bidirectional overrides, zero-width and tag
// characters), line separators, spaces other than U+0020, and characters
// that render blank (the grapheme joiner, variation selectors, Hangul
// fillers and the braille blank)
const DISGUISING_RE =
  // Each character matches alone, so a combining one in the class is meant
  // eslint-disable-next-line no-control-regex, no-misleading-character-class
  /[\u0080-\u009f\p{Cf}\p{Zl}\p{Zp}\u00a0\u034f\u115f\u1160\u1680\u2000-\u200a\u202f\u205f\u2800\u3000\u3164\ufe00-\ufe0f\uffa0\u{e0100}-\u{e01ef}]/gu

const escape_disguising = (text) =>
  text.replace(DISGUISING_RE, (char) => {
    const hex = char.codePointAt(0).toString(16)
    return hex.length > 4 ? `\\u{${hex}}` : `\\u${hex.padStart(4, '0')}`
  })

// Server text and echoed input are printed to a terminal, so C0 controls are
// removed and disguising characters show escaped
const printable = (text) =>
  // eslint-disable-next-line no-control-regex
  escape_disguising(String(text).replace(/[\u0000-\u001f\u007f]/g, ''))

// JSON.stringify escapes C0 controls, and the rest show escaped, so what the
// operator reviews is what is signed
const reviewable = (value) => escape_disguising(JSON.stringify(value, null, 2))

// The response body as text, refused past MAX_RESPONSE_BYTES so a hostile
// server cannot fill a small host's memory
const read_body = async (response) => {
  const chunks = []
  let size = 0
  for await (const chunk of response.body ?? []) {
    size += chunk.length
    if (size > MAX_RESPONSE_BYTES) {
      throw new Error('the response is larger than 1 MiB')
    }
    chunks.push(chunk)
  }
  return Buffer.concat(chunks).toString('utf8')
}

// Posts a signed body. A redirect is refused rather than followed, so a
// signed message reaches only the origin the operator confirmed.
async function post({ api_url, path, body }) {
  let response
  let text
  try {
    response = await fetch(`${api_url}${path}`, {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
      redirect: 'error',
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
    })
    text = await read_body(response)
  } catch (error) {
    throw new Error(
      `request failed: ${error.cause?.message || error.cause?.code || error.message}`
    )
  }
  let result = null
  try {
    result = JSON.parse(text)
  } catch {
    // a body that is not JSON reports by its status
  }
  if (!response.ok) {
    throw new Error(result?.error || `HTTP ${response.status}`)
  }
  return result
}

// The private key from a hidden prompt, which a script feeds as the first
// line of stdin. An environment variable would leave it in
// /proc/<pid>/environ, the shell, its history and every program the shell
// starts, so the variable earlier versions read is refused while it is set.
// The key is never printed or written.
async function load_private_key() {
  if (process.env.NC_CLI_NANO_PRIVATE_KEY !== undefined) {
    throw new Error(
      'NC_CLI_NANO_PRIVATE_KEY is no longer read. Unset it, and enter the key at the prompt or pipe it on stdin.'
    )
  }
  const private_key = (
    (await ask_hidden('Private key (64 hex characters, hidden):')) || ''
  ).trim()
  // get_public_key refuses anything but 64 hex characters, without echoing it
  const public_key = get_public_key(private_key)
  return {
    private_key,
    public_key,
    nano_account_address: encode_nano_account(Buffer.from(public_key, 'hex'))
  }
}

// A payload signed now. A nano.community message carries a one-time nonce;
// the nostr profiles, printed rather than sent, have none. The time and
// nonce are set before the review, so the operator sees exactly what is
// signed.
const create_payload = ({
  domain = 'nano.community',
  account,
  action,
  parameters,
  statement
}) => ({
  version: 1,
  domain,
  action,
  account,
  issued_at: Math.floor(Date.now() / 1000),
  ...(domain === 'nano.community' && {
    nonce: crypto.randomBytes(16).toString('hex')
  }),
  ...(statement && { statement }),
  parameters
})

// Shows every payload that will be signed and where it goes, then signs and
// posts only on y. Returns whether it sent.
const confirm_and_post = async ({ api_url, path, payloads, sign, sent }) => {
  console.log(`This will be signed and sent to ${api_url}${path}:`)
  for (const payload of payloads) console.log(reviewable(payload))
  if (!(await confirm('Sign and send?'))) {
    console.log('Cancelled. Nothing was signed or sent.')
    return false
  }
  const response = await post({ api_url, path, body: sign() })
  console.log(`${sent}:`, reviewable(response))
  return true
}

const add_signing_key = {
  name: 'add-signing-key',
  describe: 'Add a new signing key',
  handler: async ({ api_url }) => {
    const { private_key, nano_account_address } = await load_private_key()

    const linked_private_key = crypto.randomBytes(32).toString('hex')
    const linked_public_key = get_public_key(linked_private_key)

    // The account consents to the key, and the key consents to the account
    const link = create_payload({
      account: nano_account_address,
      action: 'link_key',
      parameters: { linked_public_key }
    })
    const accept = create_payload({
      account: encode_nano_account(Buffer.from(linked_public_key, 'hex')),
      action: 'accept_link',
      parameters: { linked_account: nano_account_address }
    })
    const sent = await confirm_and_post({
      api_url,
      path: '/api/auth/register/key',
      payloads: [link, accept],
      sign: () => ({
        link: sign_message({ payload: link, private_key }),
        accept: sign_message({
          payload: accept,
          private_key: linked_private_key
        })
      }),
      sent: 'Key registration successful'
    })
    if (!sent) return
    console.log(`Signing public key: ${linked_public_key}`)
    // The private key goes to stderr, so output piped or redirected to a
    // file does not carry it
    console.error(
      'Store the signing private key now. It is shown once and saved nowhere:'
    )
    console.error(linked_private_key)
  }
}

const revoke_signing_key = {
  name: 'revoke-signing-key',
  args: ['linked_public_key'],
  describe: 'Revoke an existing signing key',
  handler: async ({ api_url, args: [linked_public_key] }) => {
    linked_public_key = linked_public_key.toLowerCase()
    if (!HEX_64_RE.test(linked_public_key)) {
      throw new Error('linked_public_key must be 64 hex characters')
    }

    const { nano_account_address, private_key } = await load_private_key()
    const payload = create_payload({
      account: nano_account_address,
      action: 'revoke_key',
      parameters: { linked_public_key }
    })
    console.log(`Revoking the signing key ${linked_public_key}`)
    await confirm_and_post({
      api_url,
      path: '/api/auth/revoke/key',
      payloads: [payload],
      sign: () => sign_message({ payload, private_key }),
      sent: 'Key revocation successful'
    })
  }
}

// Signs one message to /api/auth/message after the operator reviews it
const send_message = async ({
  api_url,
  key: { private_key, nano_account_address },
  action,
  content,
  references = []
}) => {
  const payload = create_payload({
    account: nano_account_address,
    action,
    parameters: { content, references, tags: [] }
  })
  await confirm_and_post({
    api_url,
    path: '/api/auth/message',
    payloads: [payload],
    sign: () => sign_message({ payload, private_key }),
    sent: 'Message sent'
  })
}

// Asks for each field, then lets the operator change any before signing.
// Answers are strings.
const ask_fields = async (fields) => {
  const content = {}
  for (const { name, message } of fields) {
    const answer = await ask(message)
    if (answer === null) throw new Error('Input ended before every field')
    content[name] = answer
  }
  const names = fields.map(({ name }) => name)
  for (;;) {
    console.log('Please review your message content:')
    console.log(reviewable(content))
    if (!(await confirm('Would you like to edit any field?'))) return content
    const field = (
      (await ask(`Which field? (${names.join(', ')})`)) || ''
    ).trim()
    if (!names.includes(field)) {
      console.log(`No field named ${printable(field)}`)
      continue
    }
    const value = await ask(`Enter new value for ${field}:`)
    if (value === null) throw new Error('Input ended before the new value')
    content[field] = value
  }
}

const REP_META_FIELDS = [
  { name: 'alias', message: 'Alias:' },
  { name: 'description', message: 'Description:' },
  { name: 'donation_address', message: 'Donation Address:' },
  { name: 'cpu_model', message: 'CPU Model:' },
  { name: 'cpu_cores', message: 'CPU Cores:' },
  { name: 'ram', message: 'RAM Amount (GB):' },
  { name: 'reddit', message: 'Reddit Username:' },
  { name: 'twitter', message: 'Twitter Username:' },
  { name: 'discord', message: 'Discord Username:' },
  { name: 'discord_user_id', message: 'Discord User ID:' },
  { name: 'github', message: 'GitHub Username:' },
  { name: 'email', message: 'Email:' },
  { name: 'website', message: 'Website URL:' }
]

const update_rep_meta = {
  name: 'update-rep-meta',
  describe: 'Update representative metadata',
  handler: async ({ api_url }) =>
    send_message({
      api_url,
      key: await load_private_key(),
      action: 'set_representative_meta',
      content: await ask_fields(REP_META_FIELDS)
    })
}

const update_account_meta = {
  name: 'update-account-meta',
  describe: 'Update account metadata',
  handler: async ({ api_url }) =>
    send_message({
      api_url,
      key: await load_private_key(),
      action: 'set_account_meta',
      content: await ask_fields([{ name: 'alias', message: 'Alias:' }])
    })
}

const update_block_meta = {
  name: 'update-block-meta',
  args: ['block_hash'],
  describe: 'Update block metadata',
  handler: async ({ api_url, args: [block_hash] }) => {
    block_hash = block_hash.toLowerCase()
    if (!HEX_64_RE.test(block_hash)) {
      throw new Error('A 64 hex character block hash is required')
    }
    await send_message({
      api_url,
      key: await load_private_key(),
      action: 'set_block_meta',
      content: await ask_fields([{ name: 'note', message: 'Note:' }]),
      references: [block_hash]
    })
  }
}

const report_representative_hardware = {
  name: 'report-representative-hardware',
  describe:
    'Sign the details of the host this representative runs on, for its power estimate (see /network-energy-usage)',
  handler: async ({ api_url }) => {
    const key = await load_private_key()
    const content = collect_host_hardware()
    if (!content.cpu_model) {
      throw new Error('No CPU model found in /proc/cpuinfo')
    }
    await send_message({
      api_url,
      key,
      action: 'set_representative_hardware',
      content
    })
  }
}

// An ISO 8601 datetime with an explicit Z or offset, so a reading's window
// cannot shift by the host's time zone
const ISO_DATETIME_RE =
  /^(\d{4})-(\d{2})-(\d{2})T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/i

// Answers are strings, so a power reading's fields become a number and epoch
// seconds after the edit loop, which an edited answer goes through too. A
// date that does not exist is refused, since Date.parse would roll
// 2026-02-30 over to March 2.
const parse_epoch_seconds = (value) => {
  const match = ISO_DATETIME_RE.exec(value.trim())
  const milliseconds = Date.parse(value.trim())
  const [year, month, day] = (match || []).slice(1, 4).map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  if (
    !match ||
    Number.isNaN(milliseconds) ||
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new Error(`not an ISO 8601 datetime with a Z or offset: ${value}`)
  }
  return Math.floor(milliseconds / 1000)
}

const parse_power_reading_content = ({
  energy_watt_hours,
  measurement_method,
  measurement_started_at,
  measurement_ended_at
}) => {
  const energy = Number(energy_watt_hours.trim())
  if (
    !/^[0-9]+$/.test(energy_watt_hours.trim()) ||
    !Number.isSafeInteger(energy)
  ) {
    throw new Error(`not a whole number of watt-hours: ${energy_watt_hours}`)
  }
  return {
    energy_watt_hours: energy,
    measurement_method: measurement_method.trim(),
    measurement_started_at: parse_epoch_seconds(measurement_started_at),
    measurement_ended_at: parse_epoch_seconds(measurement_ended_at)
  }
}

const update_representative_power_reading = {
  name: 'update-representative-power-reading',
  describe:
    'Sign a measured power reading for a representative (see /network-energy-usage)',
  handler: async ({ api_url }) => {
    const key = await load_private_key()
    const answers = await ask_fields([
      {
        name: 'energy_watt_hours',
        message: 'Energy used over the window (whole watt-hours):'
      },
      {
        name: 'measurement_method',
        message:
          'Measurement method (wall_meter or baseboard_management_controller):'
      },
      {
        name: 'measurement_started_at',
        message: 'Measurement start (ISO 8601, e.g. 2026-11-13T00:00:00Z):'
      },
      {
        name: 'measurement_ended_at',
        message: 'Measurement end, at least 24 hours later (ISO 8601):'
      }
    ])
    await send_message({
      api_url,
      key,
      action: 'set_representative_power_reading',
      content: parse_power_reading_content(answers)
    })
  }
}

// Signs a nostr-domain payload and prints the issued_at:signature proof the
// task board reads, with the tags that carry it. Nothing is sent.
const print_proof = ({ payload, private_key, output }) => {
  const { signature } = sign_message({ payload, private_key })
  const proof = `${payload.issued_at}:${signature}`
  console.log(JSON.stringify(output(proof), null, 2))
}

// Signs the nano-signed-message bind_nostr_key profile: the proof a nostr
// key publishes (kind 10011) to show it controls this Nano account on the
// nano.community task board. Paste the output on the board's account page.
const bind_nostr_key = {
  name: 'bind-nostr-key',
  args: ['npub'],
  describe: 'Sign a proof that binds this Nano account to a nostr key',
  handler: async ({ args: [npub] }) => {
    if (!decode_npub(npub)) {
      throw new Error('Expected an npub, for example npub1...')
    }
    const { private_key, nano_account_address } = await load_private_key()
    print_proof({
      payload: create_payload({
        domain: 'nostr',
        action: 'bind_nostr_key',
        account: nano_account_address,
        parameters: {},
        statement: `Verifying that I control the following Nostr public key: ${npub}`
      }),
      private_key,
      output: (proof) => ({
        account: nano_account_address,
        proof,
        tag: ['i', `nano:${nano_account_address}`, proof]
      })
    })
  }
}

// Converts a decimal XNO amount to raw (10^30 raw per XNO) without floats.
// Returns null for anything that is not a positive amount with at most 30
// decimals.
function xno_to_raw(amount) {
  const match = /^([0-9]+)(?:\.([0-9]{1,30}))?$/.exec(String(amount).trim())
  if (!match) return null
  const raw = BigInt(match[1] + (match[2] || '').padEnd(30, '0'))
  return raw > 0n ? raw.toString() : null
}

// Decodes an npub to its 64-character hex key (NIP-19 bech32), or returns
// null. No checksum library is needed: the bech32 checksum is verified here,
// and the padding bits must be zero, so one key has one npub.
function decode_npub(npub) {
  const CHARSET = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l'
  const polymod = (values) => {
    const GEN = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3]
    let chk = 1
    for (const value of values) {
      const top = chk >> 25
      chk = ((chk & 0x1ffffff) << 5) ^ value
      for (let i = 0; i < 5; i++) if ((top >> i) & 1) chk ^= GEN[i]
    }
    return chk
  }
  if (!/^npub1[02-9ac-hj-np-z]{58}$/.test(npub)) return null
  const data = [...npub.slice(5)].map((char) => CHARSET.indexOf(char))
  const hrp = [...'npub'].map((char) => char.charCodeAt(0))
  const expanded = [...hrp.map((c) => c >> 5), 0, ...hrp.map((c) => c & 31)]
  if (polymod([...expanded, ...data]) !== 1) return null
  let acc = 0
  let bits = 0
  const bytes = []
  for (const value of data.slice(0, -6)) {
    acc = (acc << 5) | value
    bits += 5
    if (bits >= 8) {
      bits -= 8
      bytes.push((acc >> bits) & 0xff)
    }
  }
  if (acc & ((1 << bits) - 1)) return null
  return Buffer.from(bytes).toString('hex')
}

// Signs the nano-signed-message pledge profile: a public promise by this Nano
// account to pay whoever completes a task on the nano.community task board.
// Paste the output on the task's page.
const pledge = {
  name: 'pledge',
  args: ['issue_id', 'amount_xno', 'npub'],
  describe: 'Sign a pledge of XNO to a task board task',
  handler: async ({ args: [issue_id, amount_xno, npub] }) => {
    const amount_raw = xno_to_raw(amount_xno)
    const nostr_public_key = decode_npub(npub)
    if (!HEX_64_RE.test(issue_id)) {
      throw new Error('Expected the task id, 64 lowercase hex characters')
    }
    if (!amount_raw) {
      throw new Error('Expected a positive XNO amount, for example 2.5')
    }
    if (!nostr_public_key) {
      throw new Error('Expected an npub, for example npub1...')
    }
    const { private_key, nano_account_address } = await load_private_key()
    print_proof({
      payload: create_payload({
        domain: 'nostr',
        action: 'pledge',
        account: nano_account_address,
        parameters: { issue_event_id: issue_id, amount_raw, nostr_public_key }
      }),
      private_key,
      output: (proof) => ({
        account: nano_account_address,
        issue_id,
        amount_raw,
        proof,
        tags: [
          ['amount', amount_raw],
          ['nano_account', nano_account_address],
          ['nano_proof', proof]
        ]
      })
    })
  }
}

const COMMANDS = [
  add_signing_key,
  revoke_signing_key,
  update_rep_meta,
  update_account_meta,
  update_block_meta,
  update_representative_power_reading,
  report_representative_hardware,
  bind_nostr_key,
  pledge
]

const usage = (command) => {
  const line = ({ name, args = [] }) =>
    [name, ...args.map((arg) => `<${arg}>`)].join(' ')
  if (command)
    return `Usage: nano-community ${line(command)}\n\n${command.describe}`
  const width = Math.max(...COMMANDS.map((c) => line(c).length))
  return [
    'Usage: nano-community <command> [args]',
    '',
    'Commands:',
    ...COMMANDS.map((c) => `  ${line(c).padEnd(width)}  ${c.describe}`),
    '',
    'Options:',
    '  -h, --help     Show help',
    '  -v, --version  Show the version',
    '',
    'The private key is read at a hidden prompt, or from the first line of stdin.'
  ].join('\n')
}

export async function main(argv, { api_url = API_URL } = {}) {
  let parsed
  try {
    parsed = parseArgs({
      args: argv,
      options: {
        help: { type: 'boolean', short: 'h' },
        version: { type: 'boolean', short: 'v' }
      },
      allowPositionals: true
    })
  } catch (error) {
    console.error(`${printable(error.message)}\n\n${usage()}`)
    return 1
  }
  const { values, positionals } = parsed
  if (values.version) {
    const { version } = JSON.parse(
      readFileSync(new URL('./package.json', import.meta.url), 'utf8')
    )
    console.log(version)
    return 0
  }
  const [name, ...args] = positionals
  const command = COMMANDS.find((c) => c.name === name)
  if (values.help) {
    console.log(usage(command))
    return 0
  }
  if (!command) {
    if (name) console.error(`Unknown command: ${printable(name)}\n`)
    console.error(usage())
    return 1
  }
  if (args.length !== (command.args || []).length) {
    console.error(usage(command))
    return 1
  }

  try {
    await command.handler({ api_url, args })
    return 0
  } catch (error) {
    // One line for any failure: a stack trace tells an operator nothing,
    // and server text and echoed input lose their control characters
    console.error(printable(error.message))
    return 1
  } finally {
    close_prompts()
  }
}

if (isMain(import.meta.url)) {
  process.exitCode = await main(process.argv.slice(2))
}
