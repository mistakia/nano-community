/* global describe it */
import chai from 'chai'

import {
  vps_select_expression,
  vps_time_column
} from '#root/scripts/archive-to-postgres.mjs'

const { expect } = chai

describe('archive delta projection of VPS timestamptz columns', () => {
  it('projects a renamed instant to epoch seconds under its archive name', () => {
    expect(
      vps_select_expression('representatives_telemetry', 'timestamp')
    ).to.equal('extract(epoch from "observed_at")::integer AS "timestamp"')
    expect(
      vps_select_expression('representatives_telemetry', 'telemetry_timestamp')
    ).to.equal(
      'extract(epoch from "reported_at")::integer AS "telemetry_timestamp"'
    )
  })

  it('selects other columns as they are', () => {
    expect(vps_select_expression('representatives_uptime', 'online')).to.equal(
      '"online"'
    )
  })

  it('orders each table on its VPS time or sequence column', () => {
    expect(vps_time_column('representatives_uptime')).to.equal('observed_at')
    expect(vps_time_column('posts')).to.equal('created_at')
    expect(vps_time_column('network_events')).to.equal('network_event_sequence')
  })
})
