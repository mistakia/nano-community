/* global describe before beforeEach it */
import chai from 'chai'
import chaiHTTP from 'chai-http'

import server from '#api/server.mjs'
import cache from '#api/cache.mjs'
import knex from '#db'
import { mochaGlobalSetup } from './global.mjs'

chai.use(chaiHTTP)
const expect = chai.expect

const REP_A = `nano_3${'1'.repeat(59)}`
const REP_B = `nano_3${'3'.repeat(59)}`

const DAY_SECONDS = 86400
const FIRST_DAY = 19700 * DAY_SECONDS

const meta_row = ({
  account = REP_A,
  weight,
  delegators = null,
  timestamp
}) => ({
  account,
  weight,
  delegators,
  timestamp
})

const get_delegation_history = (address) =>
  chai.request(server).get(`/api/accounts/${address}/delegation_history`)

describe('API /accounts/:address/delegation_history', () => {
  before(async () => {
    await mochaGlobalSetup()
    await knex('accounts_meta').del()
    // the second day has no samples, and the first day has two
    await knex('accounts_meta').insert([
      meta_row({ weight: '100', timestamp: FIRST_DAY + 300 }),
      meta_row({ weight: '150', timestamp: FIRST_DAY + 600 }),
      meta_row({
        weight: '300',
        delegators: 7,
        timestamp: FIRST_DAY + 2 * DAY_SECONDS + 300
      }),
      // a stale-snapshot sample later in the day keeps the recorded count
      meta_row({
        weight: '310',
        timestamp: FIRST_DAY + 2 * DAY_SECONDS + 600
      }),
      meta_row({ account: REP_B, weight: '999', timestamp: FIRST_DAY + 300 })
    ])
  })

  beforeEach(() => cache.flushAll())

  it('returns one row per sampled day, oldest first, with the last sample of each day', async () => {
    const res = await get_delegation_history(REP_A)

    expect(res).to.have.status(200)
    // db/index.mjs parses NUMERIC as a float, so weight arrives as a number
    expect(res.body).to.deep.equal([
      { timestamp: FIRST_DAY, weight: 150, delegators: null },
      { timestamp: FIRST_DAY + 2 * DAY_SECONDS, weight: 310, delegators: 7 }
    ])
  })

  it('returns an empty list for an account with no samples', async () => {
    const res = await get_delegation_history(`nano_3${'4'.repeat(59)}`)

    expect(res).to.have.status(200)
    expect(res.body).to.deep.equal([])
  })

  it('rejects an invalid address', async () => {
    const res = await get_delegation_history('nano_invalid')

    expect(res).to.have.status(401)
  })
})
