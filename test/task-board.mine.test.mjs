/* global describe it */
import chai from 'chai'
import { finalizeEvent, generateSecretKey, getPublicKey } from 'nostr-tools'

import { mine_event_pow } from '../src/core/task-board/mine-event-pow.mjs'
import {
  TASK_UNVOUCHED_POW_DIFFICULTY,
  get_event_pow
} from '#common/task-board/index.mjs'

const expect = chai.expect

describe('task board proof of work mining', () => {
  it('mines an event that keeps its proof of work once signed', async function () {
    this.timeout(30000)
    const secret_key = generateSecretKey()
    const template = {
      kind: 1111,
      created_at: 0,
      pubkey: getPublicKey(secret_key),
      tags: [['nonce', 'stale', '1']],
      content: 'A comment'
    }
    const mined = await mine_event_pow({
      template,
      difficulty: TASK_UNVOUCHED_POW_DIFFICULTY
    })
    const signed = finalizeEvent(mined, secret_key)
    expect(signed.id).to.equal(mined.id)
    expect(get_event_pow(signed)).to.equal(TASK_UNVOUCHED_POW_DIFFICULTY)
    expect(signed.tags.filter((tag) => tag[0] === 'nonce')).to.have.length(1)
  })
})
