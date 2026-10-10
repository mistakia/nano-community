/* global describe it */
import chai from 'chai'
import { generateSecretKey, getPublicKey, finalizeEvent } from 'nostr-tools'
import { minePow } from 'nostr-tools/nip13'

import {
  TASK_UNVOUCHED_POW_DIFFICULTY,
  get_event_pow
} from '#common/task-board/index.mjs'

const expect = chai.expect

const template = () => ({
  kind: 1111,
  created_at: Math.floor(Date.now() / 1000),
  tags: [],
  content: `A comment ${Math.random()}`
})

// Mined with the signer's pubkey in place, so signing keeps the mined id.
const mine = (difficulty) => {
  const secret_key = generateSecretKey()
  const pubkey = getPublicKey(secret_key)
  return finalizeEvent(
    minePow({ ...template(), pubkey }, difficulty),
    secret_key
  )
}

describe('task board proof of work', () => {
  it('counts a mined event at its committed difficulty', () => {
    const event = mine(TASK_UNVOUCHED_POW_DIFFICULTY)
    expect(get_event_pow(event)).to.equal(TASK_UNVOUCHED_POW_DIFFICULTY)
  })

  it('caps a lucky hash at the committed difficulty', () => {
    const event = mine(4)
    const id = '0000' + event.id.slice(4)
    expect(get_event_pow({ ...event, id })).to.equal(4)
  })

  it('counts an id short of its committed difficulty at its leading zeros', () => {
    const event = mine(4)
    const tags = event.tags.map((tag) =>
      tag[0] === 'nonce' ? [tag[0], tag[1], '20'] : tag
    )
    const id = '0f' + event.id.slice(2)
    expect(get_event_pow({ ...event, tags, id })).to.equal(4)
  })

  it('counts nothing without a committed nonce', () => {
    const event = finalizeEvent(template(), generateSecretKey())
    expect(get_event_pow({ ...event, id: '0'.repeat(64) })).to.equal(0)
    const uncommitted = {
      ...event,
      id: '0'.repeat(64),
      tags: [['nonce', '12']]
    }
    expect(get_event_pow(uncommitted)).to.equal(0)
  })
})
