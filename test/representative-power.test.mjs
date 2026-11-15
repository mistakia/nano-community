/* global describe it */
import chai from 'chai'

import {
  format_representative_power,
  get_representative_power
} from '#common/representative-power.mjs'
import {
  get_representative_value,
  REPRESENTATIVE_COLUMN_IDS
} from '#common/representative-table-columns.mjs'

const expect = chai.expect

const hardware_report = {
  estimated_power_watts: 12.5,
  cpu_generation: 'epyc_2nd_gen',
  issued_at: 1763164800
}

const power_reading = {
  energy_watt_hours: 1681,
  average_power_watts: 1681 / 24,
  measurement_method: 'baseboard_management_controller',
  measurement_started_at: 1763078400 - 86400,
  measurement_ended_at: 1763078400,
  issued_at: 1763078460,
  message_digest: 'ab'.repeat(32)
}

describe('get_representative_power', () => {
  const cases = [
    [
      'a signed reading only',
      { power_reading, watt_hour: null },
      {
        power_watts: 1681 / 24,
        power_source: 'baseboard_management_controller',
        as_of: 1763078400
      },
      '70 W (Baseboard management controller, 2025-11-14)'
    ],
    [
      'a CPU TDP specification only',
      { power_reading: null, watt_hour: 90 },
      {
        power_watts: 90,
        power_source: 'cpu_tdp_specification',
        as_of: null
      },
      '90 W (CPU TDP specification)'
    ],
    [
      'both, where the signed reading wins',
      { power_reading, watt_hour: 90 },
      {
        power_watts: 1681 / 24,
        power_source: 'baseboard_management_controller',
        as_of: 1763078400
      },
      '70 W (Baseboard management controller, 2025-11-14)'
    ],
    [
      'a hardware report and a CPU TDP specification, where the estimate wins',
      { power_reading: null, hardware_report, watt_hour: 90 },
      {
        power_watts: 12.5,
        power_source: 'hardware_estimate',
        as_of: 1763164800
      },
      '13 W (Estimated from hardware, 2025-11-15)'
    ],
    [
      'a signed reading and a hardware report, where the reading wins',
      { power_reading, hardware_report, watt_hour: null },
      {
        power_watts: 1681 / 24,
        power_source: 'baseboard_management_controller',
        as_of: 1763078400
      },
      '70 W (Baseboard management controller, 2025-11-14)'
    ],
    [
      'a hardware report whose CPU generation is unknown',
      {
        power_reading: null,
        hardware_report: { estimated_power_watts: null, issued_at: 1 },
        watt_hour: null
      },
      null,
      ''
    ],
    ['none', { power_reading: null, watt_hour: null }, null, '']
  ]

  for (const [label, row, expected, formatted] of cases) {
    it(`returns the power for ${label}`, () => {
      const power = get_representative_power(row)
      expect(power).to.deep.equal(expected)
      expect(format_representative_power(power)).to.equal(formatted)
      expect(
        get_representative_value(row, REPRESENTATIVE_COLUMN_IDS.WATT_HOUR)
      ).to.equal(expected ? expected.power_watts : null)
    })
  }
})
