/* global describe before beforeEach it */
import chai from 'chai'

import knex from '#db'
import { get_delegator_counts } from '#root/scripts/import-accounts-meta.mjs'
import { mochaGlobalSetup } from './global.mjs'

const expect = chai.expect

const NOW = 1700000000
const NANO = '1000000000000000000000000000000'

const account = (digit) => `nano_3${String(digit).repeat(59)}`

const REP_A = account(1)
const REP_B = account(3)
const REP_C = account(4)

const delegator_row = ({ digit, representative, timestamp = NOW - 600 }) => ({
  account: `nano_1${String(digit).repeat(59)}`,
  representative,
  balance: NANO,
  timestamp
})

describe('import-accounts-meta delegator counts', function () {
  before(mochaGlobalSetup)

  beforeEach(async () => {
    await knex('accounts_delegators').del()
  })

  it('counts delegators per representative and gives 0 to reps with none', async () => {
    await knex('accounts_delegators').insert([
      delegator_row({ digit: 5, representative: REP_A }),
      delegator_row({ digit: 6, representative: REP_A }),
      delegator_row({ digit: 7, representative: REP_B })
    ])

    const counts = await get_delegator_counts({
      accounts: [REP_A, REP_B, REP_C],
      now: NOW
    })

    expect(counts.get(REP_A)).to.equal(2)
    expect(counts.get(REP_B)).to.equal(1)
    expect(counts.get(REP_C)).to.equal(0)
  })

  it('returns null when the snapshot is older than three hours', async () => {
    await knex('accounts_delegators').insert([
      delegator_row({
        digit: 5,
        representative: REP_A,
        timestamp: NOW - 3 * 60 * 60 - 1
      })
    ])

    const counts = await get_delegator_counts({ accounts: [REP_A], now: NOW })

    expect(counts).to.equal(null)
  })

  it('returns null when the snapshot is empty', async () => {
    const counts = await get_delegator_counts({ accounts: [REP_A], now: NOW })

    expect(counts).to.equal(null)
  })
})
