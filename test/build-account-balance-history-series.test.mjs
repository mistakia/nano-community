/* global describe it */
import chai from 'chai'

import { build_account_balance_history_series } from '#common/build-account-balance-history-series.mjs'

const expect = chai.expect

const NANO = '1000000000000000000000000000000'

const balance_row = (date, nano_amount) => ({
  date_unix: Date.parse(`${date}T00:00:00.000Z`) / 1000,
  date: `${date}T00:00:00.000Z`,
  balance: (BigInt(NANO) * BigInt(nano_amount)).toString()
})

const price_row = (date, price) => ({
  timestamp_utc: `${date}T00:00:00.000Z`,
  price
})

const price_history = [
  price_row('2026-11-01', '1.00'),
  price_row('2026-11-02', '2.00'),
  price_row('2026-11-03', '3.00'),
  price_row('2026-11-04', '4.00')
]

describe('build_account_balance_history_series', () => {
  it('continues the balance series to the present day at the last balance', () => {
    const { balance_series } = build_account_balance_history_series({
      balance_history: [
        balance_row('2026-11-01', 10),
        balance_row('2026-11-02', 30)
      ],
      price_history,
      now: new Date('2026-11-05T15:30:00.000Z')
    })
    expect(balance_series).to.deep.equal([
      ['2026-11-01T00:00:00.000Z', 10],
      ['2026-11-02T00:00:00.000Z', 30],
      ['2026-11-05T00:00:00.000Z', 30]
    ])
  })

  it('adds no closing point when the last transaction is today', () => {
    const { balance_series } = build_account_balance_history_series({
      balance_history: [
        balance_row('2026-11-01', 10),
        balance_row('2026-11-05', 30)
      ],
      price_history,
      now: new Date('2026-11-05T15:30:00.000Z')
    })
    expect(balance_series).to.have.length(2)
    expect(balance_series[1]).to.deep.equal(['2026-11-05T00:00:00.000Z', 30])
  })

  it('returns empty series for an account with no history', () => {
    expect(
      build_account_balance_history_series({
        balance_history: [],
        price_history,
        now: new Date('2026-11-05T15:30:00.000Z')
      })
    ).to.deep.equal({
      balance_series: [],
      usd_value_series: [],
      usd_price_series: []
    })
  })

  it('values a transaction day at its closing balance and continues to the latest price', () => {
    const { usd_value_series, usd_price_series } =
      build_account_balance_history_series({
        balance_history: [
          balance_row('2026-11-01', 10),
          balance_row('2026-11-03', 30)
        ],
        price_history,
        now: new Date('2026-11-05T15:30:00.000Z')
      })
    expect(usd_value_series).to.deep.equal([
      ['2026-11-01', '10.00'],
      ['2026-11-02', '20.00'],
      ['2026-11-03', '90.00'],
      ['2026-11-04', '120.00']
    ])
    expect(usd_price_series).to.deep.equal([
      ['2026-11-01', '1.00'],
      ['2026-11-02', '2.00'],
      ['2026-11-03', '3.00'],
      ['2026-11-04', '4.00']
    ])
  })

  it('emits no USD point before the first transaction', () => {
    const { usd_value_series, usd_price_series } =
      build_account_balance_history_series({
        balance_history: [balance_row('2026-11-03', 5)],
        price_history,
        now: new Date('2026-11-04T01:00:00.000Z')
      })
    expect(usd_value_series).to.deep.equal([
      ['2026-11-03', '15.00'],
      ['2026-11-04', '20.00']
    ])
    expect(usd_price_series.map(([date]) => date)).to.deep.equal([
      '2026-11-03',
      '2026-11-04'
    ])
  })
})
