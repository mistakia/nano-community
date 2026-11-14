/* global describe it */
import chai from 'chai'

import { build_delegation_history_series } from '#common/build-delegation-history-series.mjs'

const expect = chai.expect

const RAW_PER_NANO = 1e30

const day = (date) => Date.parse(`${date}T00:00:00.000Z`) / 1000

const history_row = (date, nano_weight, delegators) => ({
  timestamp: day(date),
  weight: nano_weight * RAW_PER_NANO,
  delegators
})

describe('build_delegation_history_series', () => {
  it('maps contiguous days to millisecond points with weight in Nano', () => {
    const { weight_series, delegators_series } =
      build_delegation_history_series({
        delegation_history: [
          history_row('2026-11-01', 10, 3),
          history_row('2026-11-02', 12, 4)
        ]
      })

    // weight arrives as a float (db/index.mjs), so compare within tolerance
    expect(weight_series.map(([milliseconds]) => milliseconds)).to.deep.equal([
      day('2026-11-01') * 1000,
      day('2026-11-02') * 1000
    ])
    expect(weight_series[0][1]).to.be.closeTo(10, 1e-9)
    expect(weight_series[1][1]).to.be.closeTo(12, 1e-9)
    expect(delegators_series).to.deep.equal([
      [day('2026-11-01') * 1000, 3],
      [day('2026-11-02') * 1000, 4]
    ])
  })

  it('fills a missing day with null in both series', () => {
    const { weight_series, delegators_series } =
      build_delegation_history_series({
        delegation_history: [
          history_row('2026-11-01', 10, 3),
          history_row('2026-11-03', 14, 5)
        ]
      })

    expect(weight_series[1]).to.deep.equal([day('2026-11-02') * 1000, null])
    expect(delegators_series[1]).to.deep.equal([day('2026-11-02') * 1000, null])
    expect(weight_series).to.have.length(3)
  })

  it('keeps weight while delegators are null before they were recorded', () => {
    const { weight_series, delegators_series } =
      build_delegation_history_series({
        delegation_history: [
          history_row('2026-11-01', 10, null),
          history_row('2026-11-02', 12, 4)
        ]
      })

    expect(weight_series[0][1]).to.be.closeTo(10, 1e-9)
    expect(delegators_series[0]).to.deep.equal([day('2026-11-01') * 1000, null])
  })

  it('returns empty series for no history', () => {
    expect(
      build_delegation_history_series({ delegation_history: [] })
    ).to.deep.equal({ weight_series: [], delegators_series: [] })
  })
})
