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

const DEFAULT_API_URL = 'https://nano.community'
const REQUEST_TIMEOUT_MS = 20000
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

// A failure the CLI reports as one line, without a stack
class CliError extends Error {}

// Server text is printed to a terminal, so control characters are removed
const printable = (text) =>
  // eslint-disable-next-line no-control-regex
  String(text).replace(/[\u0000-\u001f\u007f-\u009f]/g, '')

// JSON.stringify escapes C0 controls; C1 controls and bidirectional overrides
// could still reorder or hide part of the review, so they show escaped
const reviewable = (text) =>
  text.replace(
    // eslint-disable-next-line no-control-regex
    /[\u0080-\u009f\u200e\u200f\u202a-\u202e\u2066-\u2069]/g,
    (char) => `\\u${char.charCodeAt(0).toString(16).padStart(4, '0')}`
  )

// The API every signed message goes to. NC_CLI_API_URL overrides it, for a
// local server only over http, and the override is announced on stderr.
let api_url = null
function get_api_url() {
  if (api_url) return api_url
  const override = process.env.NC_CLI_API_URL
  if (!override) {
    api_url = DEFAULT_API_URL
    return api_url
  }
  let url
  try {
    url = new URL(override)
  } catch {
    throw new CliError('NC_CLI_API_URL is not a URL')
  }
  const is_loopback = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && is_loopback)) {
    throw new CliError('NC_CLI_API_URL must be https, or http to localhost')
  }
  api_url = url.origin
  if (api_url !== DEFAULT_API_URL) {
    console.error(
      `Warning: NC_CLI_API_URL sends to ${api_url}, not ${DEFAULT_API_URL}`
    )
  }
  return api_url
}

// Posts a signed body. A redirect is refused rather than followed, so a
// signed message reaches only the origin the operator confirmed.
async function post({ path, body }) {
  let response
  try {
    response = await fetch(`${get_api_url()}${path}`, {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
      redirect: 'error',
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
    })
  } catch (error) {
    throw new CliError(
      `request failed: ${printable(error.cause?.message || error.cause?.code || error.message)}`
    )
  }
  let result = null
  try {
    result = await response.json()
  } catch {
    // a body that is not JSON reports by its status
  }
  if (!response.ok) {
    throw new CliError(printable(result?.error || `HTTP ${response.status}`))
  }
  return result
}

// The private key from NC_CLI_NANO_PRIVATE_KEY, else a hidden prompt. It is
// removed from the environment once read, and never printed or written.
async function load_private_key() {
  let private_key = process.env.NC_CLI_NANO_PRIVATE_KEY
  if (private_key) {
    delete process.env.NC_CLI_NANO_PRIVATE_KEY
    console.error('Private key found in environment variable.')
  } else {
    console.error(
      'No private key found in environment variable (NC_CLI_NANO_PRIVATE_KEY).'
    )
    private_key = await ask_hidden('Private key (64 hex characters, hidden):')
  }
  private_key = (private_key || '').trim()
  if (!HEX_64_RE.test(private_key.toLowerCase())) {
    throw new CliError('The private key must be 64 hex characters')
  }
  const public_key = get_public_key(private_key)
  return {
    private_key,
    public_key,
    nano_account_address: encode_nano_account(Buffer.from(public_key, 'hex'))
  }
}

// A nano.community payload with a fresh nonce. The nonce and time are set
// before the review, so the operator sees exactly what is signed.
const create_payload = ({ account, action, parameters }) => ({
  version: 1,
  domain: 'nano.community',
  action,
  account,
  issued_at: Math.floor(Date.now() / 1000),
  nonce: crypto.randomBytes(16).toString('hex'),
  parameters
})

// Shows every payload that will be signed and where it goes, and asks once
const confirm_send = async ({ payloads, path }) => {
  const url = `${get_api_url()}${path}`
  console.log(`This will be signed and sent to ${url}:`)
  for (const payload of payloads) {
    console.log(reviewable(JSON.stringify(payload, null, 2)))
  }
  return confirm('Sign and send?')
}

const add_signing_key = {
  name: 'add-signing-key',
  describe: 'Add a new signing key',
  handler: async () => {
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
    if (
      !(await confirm_send({
        payloads: [link, accept],
        path: '/api/auth/register/key'
      }))
    ) {
      console.log('Signing key registration cancelled.')
      return
    }

    const response = await post({
      path: '/api/auth/register/key',
      body: {
        link: sign_message({ payload: link, private_key }),
        accept: sign_message({
          payload: accept,
          private_key: linked_private_key
        })
      }
    })
    console.log('Key registration successful:', response)
    console.log(
      'Store the signing private key now. It is shown once and saved nowhere:'
    )
    console.log({ linked_public_key, linked_private_key })
  }
}

const revoke_signing_key = {
  name: 'revoke-signing-key',
  args: ['linked_public_key'],
  describe: 'Revoke an existing signing key',
  handler: async ([linked_public_key]) => {
    linked_public_key = linked_public_key.toLowerCase()
    if (!HEX_64_RE.test(linked_public_key)) {
      throw new CliError('linked_public_key must be 64 hex characters')
    }

    const { nano_account_address, private_key } = await load_private_key()
    const payload = create_payload({
      account: nano_account_address,
      action: 'revoke_key',
      parameters: { linked_public_key }
    })
    console.log(`Revoking the signing key ${linked_public_key}`)
    if (
      !(await confirm_send({
        payloads: [payload],
        path: '/api/auth/revoke/key'
      }))
    ) {
      console.log('Signing key revocation cancelled.')
      return
    }

    const response = await post({
      path: '/api/auth/revoke/key',
      body: sign_message({ payload, private_key })
    })
    console.log('Key revocation successful:', response)
  }
}

// Signs one message to /api/auth/message after the operator reviews it
const send_message = async ({
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
  if (
    !(await confirm_send({ payloads: [payload], path: '/api/auth/message' }))
  ) {
    console.log('Message cancelled.')
    return
  }
  const response = await post({
    path: '/api/auth/message',
    body: sign_message({ payload, private_key })
  })
  console.log('Message sent successful:', response)
}

// Asks for each field, then lets the operator change any before signing.
// Answers are strings.
const ask_fields = async (fields) => {
  const content = {}
  for (const { name, message } of fields) {
    const answer = await ask(message)
    if (answer === null) throw new CliError('Input ended before every field')
    content[name] = answer
  }
  const names = fields.map(({ name }) => name)
  for (;;) {
    console.log('Please review your message content:', content)
    if (!(await confirm('Would you like to edit any field?'))) return content
    const field = (
      (await ask(`Which field? (${names.join(', ')})`)) || ''
    ).trim()
    if (!names.includes(field)) {
      console.log(`No field named ${printable(field)}`)
      continue
    }
    const value = await ask(`Enter new value for ${field}:`)
    if (value === null) throw new CliError('Input ended before the new value')
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
  handler: async () =>
    send_message({
      key: await load_private_key(),
      action: 'set_representative_meta',
      content: await ask_fields(REP_META_FIELDS)
    })
}

const update_account_meta = {
  name: 'update-account-meta',
  describe: 'Update account metadata',
  handler: async () =>
    send_message({
      key: await load_private_key(),
      action: 'set_account_meta',
      content: await ask_fields([{ name: 'alias', message: 'Alias:' }])
    })
}

const update_block_meta = {
  name: 'update-block-meta',
  args: ['block_hash'],
  describe: 'Update block metadata',
  handler: async ([block_hash]) => {
    block_hash = block_hash.toLowerCase()
    if (!HEX_64_RE.test(block_hash)) {
      throw new CliError('A 64 hex character block hash is required')
    }
    await send_message({
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
  handler: async () => {
    const key = await load_private_key()
    const content = collect_host_hardware()
    if (!content.cpu_model) {
      throw new CliError('No CPU model found in /proc/cpuinfo')
    }
    await send_message({ key, action: 'set_representative_hardware', content })
  }
}

// Answers are strings, so a power reading's fields become a number and epoch
// seconds after the edit loop, which an edited answer goes through too
const parse_epoch_seconds = (value) => {
  const milliseconds = Date.parse(value)
  if (Number.isNaN(milliseconds)) {
    throw new CliError(`not an ISO 8601 datetime: ${printable(value)}`)
  }
  return Math.floor(milliseconds / 1000)
}

const parse_power_reading_content = ({
  energy_watt_hours,
  measurement_method,
  measurement_started_at,
  measurement_ended_at
}) => {
  const energy = Number(energy_watt_hours)
  if (!Number.isSafeInteger(energy)) {
    throw new CliError(
      `not a whole number of watt-hours: ${printable(energy_watt_hours)}`
    )
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
  handler: async () => {
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
      key,
      action: 'set_representative_power_reading',
      content: parse_power_reading_content(answers)
    })
  }
}

// A nostr-domain payload, for a proof printed to paste elsewhere
const create_nostr_payload = ({ action, account, parameters, statement }) => {
  const issued_at = Math.floor(Date.now() / 1000)
  const payload = {
    version: 1,
    domain: 'nostr',
    action,
    account,
    issued_at,
    parameters
  }
  if (statement) payload.statement = statement
  return payload
}

// Signs the nano-signed-message bind_nostr_key profile: the proof a nostr
// key publishes (kind 10011) to show it controls this Nano account on the
// nano.community task board. Nothing is sent; paste the output on the
// board's account page.
const bind_nostr_key = {
  name: 'bind-nostr-key',
  args: ['npub'],
  describe: 'Sign a proof that binds this Nano account to a nostr key',
  handler: async ([npub]) => {
    if (!decode_npub(npub)) {
      throw new CliError('Expected an npub, for example npub1...')
    }
    const { private_key, nano_account_address } = await load_private_key()
    const payload = create_nostr_payload({
      action: 'bind_nostr_key',
      account: nano_account_address,
      parameters: {},
      statement: `Verifying that I control the following Nostr public key: ${npub}`
    })
    const { signature } = sign_message({ payload, private_key })
    const proof = `${payload.issued_at}:${signature}`
    console.log(
      JSON.stringify(
        {
          account: nano_account_address,
          proof,
          tag: ['i', `nano:${nano_account_address}`, proof]
        },
        null,
        2
      )
    )
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
// null. No checksum library is needed: the bech32 checksum is verified here.
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
  const hex = Buffer.from(bytes.slice(0, 32)).toString('hex')
  return HEX_64_RE.test(hex) ? hex : null
}

// Signs the nano-signed-message pledge profile: a public promise by this Nano
// account to pay whoever completes a task on the nano.community task board.
// Nothing is sent; paste the output on the task's page.
const pledge = {
  name: 'pledge',
  args: ['issue_id', 'amount_xno', 'npub'],
  describe: 'Sign a pledge of XNO to a task board task',
  handler: async ([issue_id, amount_xno, npub]) => {
    const amount_raw = xno_to_raw(amount_xno)
    const nostr_public_key = decode_npub(npub)
    if (!HEX_64_RE.test(issue_id)) {
      throw new CliError('Expected the task id, 64 lowercase hex characters')
    }
    if (!amount_raw) {
      throw new CliError('Expected a positive XNO amount, for example 2.5')
    }
    if (!nostr_public_key) {
      throw new CliError('Expected an npub, for example npub1...')
    }
    const { private_key, nano_account_address } = await load_private_key()
    const payload = create_nostr_payload({
      action: 'pledge',
      account: nano_account_address,
      parameters: { issue_event_id: issue_id, amount_raw, nostr_public_key }
    })
    const { signature } = sign_message({ payload, private_key })
    const proof = `${payload.issued_at}:${signature}`
    console.log(
      JSON.stringify(
        {
          account: nano_account_address,
          issue_id,
          amount_raw,
          proof,
          tags: [
            ['amount', amount_raw],
            ['nano_account', nano_account_address],
            ['nano_proof', proof]
          ]
        },
        null,
        2
      )
    )
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
    'The private key comes from NC_CLI_NANO_PRIVATE_KEY, else a hidden prompt.'
  ].join('\n')
}

async function main(argv) {
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
    console.error(`${error.message}\n\n${usage()}`)
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
    await command.handler(args)
    return 0
  } catch (error) {
    // One line for any failure: a stack trace tells an operator nothing
    console.error(printable(error.message))
    return 1
  } finally {
    close_prompts()
  }
}

if (isMain(import.meta.url)) {
  process.exitCode = await main(process.argv.slice(2))
}
