/* global describe it */
import chai from 'chai'
import { execFile } from 'child_process'
import util from 'util'
import { generateSecretKey, getPublicKey, nip19 } from 'nostr-tools'
import {
  encode_signed_message,
  verify_signed_message
} from 'nano-signed-message'

import {
  build_pledge_payload,
  build_task_pledge,
  parse_task_pledge
} from '#common/task-board/index.mjs'

const expect = chai.expect
const exec_file = util.promisify(execFile)

// The nano-signed-message test vector key; it signs nothing real.
const PRIVATE_KEY =
  '9f0e444c69f77a49bd0be89db92c38fe713e0963165cca12faf5712d7657120f'
const ISSUE_ID = 'd1'.repeat(32)
const board = { owner_pubkey: 'a'.repeat(64), d_tag: 'nano-community-tasks' }

// The key goes in on stdin, as the CLI's hidden prompt reads it
const run = (...args) => {
  const result = exec_file('node', ['cli/index.mjs', ...args])
  result.child.stdin.end(`${PRIVATE_KEY}\n`)
  return result
}

// Re-encodes an npub's data characters with a fresh bech32 checksum, so a
// test can set the padding bits and still pass the checksum
const BECH32_CHARSET = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l'
const encode_npub_data = (data) => {
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
  const hrp = [...'npub'].map((c) => c.charCodeAt(0))
  const expanded = [...hrp.map((c) => c >> 5), 0, ...hrp.map((c) => c & 31)]
  const mod = polymod([...expanded, ...data, 0, 0, 0, 0, 0, 0]) ^ 1
  const checksum = [0, 1, 2, 3, 4, 5].map((i) => (mod >> (5 * (5 - i))) & 31)
  return `npub1${[...data, ...checksum].map((v) => BECH32_CHARSET[v]).join('')}`
}

describe('Nano CLI pledge', function () {
  this.timeout(30000)

  it('signs a pledge whose proof verifies for the event author', async () => {
    const pubkey = getPublicKey(generateSecretKey())
    const { stdout } = await run(
      'pledge',
      ISSUE_ID,
      '2.5',
      nip19.npubEncode(pubkey)
    )
    const output = JSON.parse(stdout)
    expect(output.amount_raw).to.equal('2500000000000000000000000000000')
    const [issued_at, signature] = output.proof.split(':')
    const event = {
      ...build_task_pledge({
        board,
        issue_id: ISSUE_ID,
        account: output.account,
        amount_raw: output.amount_raw,
        issued_at: Number(issued_at),
        signature
      }),
      pubkey
    }
    const pledge = parse_task_pledge(event)
    const message = encode_signed_message(
      build_pledge_payload({
        account: pledge.account,
        issue_event_id: pledge.issue_id,
        amount_raw: pledge.amount_raw,
        nostr_public_key: event.pubkey,
        issued_at: pledge.issued_at
      })
    )
    const result = verify_signed_message({
      message,
      signature: pledge.signature,
      domain: 'nostr',
      actions: ['pledge'],
      now: pledge.issued_at
    })
    expect(result.payload.parameters.nostr_public_key).to.equal(pubkey)
  })

  it('converts amounts exactly and refuses bad input', async () => {
    const npub = nip19.npubEncode(getPublicKey(generateSecretKey()))
    const raw = async (amount) =>
      JSON.parse((await run('pledge', ISSUE_ID, amount, npub)).stdout)
        .amount_raw
    expect(await raw('10')).to.equal('10000000000000000000000000000000')
    expect(await raw('0.000000000000000000000000000001')).to.equal('1')

    // The same key with a padding bit set: the checksum holds, but one key
    // must have one npub
    const data = [...npub.slice(5, -6)].map((c) => BECH32_CHARSET.indexOf(c))
    expect(encode_npub_data(data)).to.equal(npub)
    data[data.length - 1] |= 1
    const padded_npub = encode_npub_data(data)
    // One more data character, still checksummed: 33 bytes is not a key
    const long_npub = encode_npub_data([
      ...data.slice(0, -1),
      data.at(-1) & ~1,
      0
    ])
    for (const args of [
      [ISSUE_ID, '0', npub],
      [ISSUE_ID, '1e3', npub],
      [ISSUE_ID, '0.0000000000000000000000000000001', npub],
      ['xyz', '1', npub],
      [ISSUE_ID, '1', npub.slice(0, -1) + (npub.endsWith('q') ? 'p' : 'q')],
      [ISSUE_ID, '1', padded_npub],
      [ISSUE_ID, '1', long_npub]
    ]) {
      const result = await run('pledge', ...args).catch((error) => error)
      expect(result.code, args.join(' ')).to.equal(1)
    }
  })
})
