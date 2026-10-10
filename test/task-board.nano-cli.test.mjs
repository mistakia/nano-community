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

const run = (...args) =>
  exec_file('node', ['cli/index.mjs', ...args], {
    env: { ...process.env, NC_CLI_NANO_PRIVATE_KEY: PRIVATE_KEY }
  })
const json_of = (stdout) => JSON.parse(stdout.slice(stdout.indexOf('{')))

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
    const output = json_of(stdout)
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
      json_of((await run('pledge', ISSUE_ID, amount, npub)).stdout).amount_raw
    expect(await raw('10')).to.equal('10000000000000000000000000000000')
    expect(await raw('0.000000000000000000000000000001')).to.equal('1')
    for (const args of [
      [ISSUE_ID, '0', npub],
      [ISSUE_ID, '1e3', npub],
      [ISSUE_ID, '0.0000000000000000000000000000001', npub],
      ['xyz', '1', npub],
      [ISSUE_ID, '1', npub.slice(0, -1) + (npub.endsWith('q') ? 'p' : 'q')]
    ]) {
      const result = await run('pledge', ...args).catch((error) => error)
      expect(result.code, args.join(' ')).to.equal(1)
    }
  })
})
