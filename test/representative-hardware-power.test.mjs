/* global describe it */
import chai from 'chai'

import {
  CPU_WATTS_PER_VCPU,
  estimate_hardware_power_watts,
  get_cpu_generation
} from '#common/representative-hardware-power.mjs'

const expect = chai.expect

describe('get_cpu_generation', () => {
  // CPU names representatives report, from /proc/cpuinfo and earlier surveys
  const cases = [
    ['AMD EPYC 7501 32-Core Processor', 'epyc_1st_gen'],
    ['AMD EPYC 7282 16-Core Processor', 'epyc_2nd_gen'],
    ['AMD Epyc 7002 series', 'epyc_2nd_gen'],
    ['AMD EPYC 7B13 64-Core Processor', 'epyc_3rd_gen'],
    ['AMD EPYC 9654 96-Core Processor', 'epyc_4th_gen'],
    ['AMD EPYC-Rome Processor', 'epyc_2nd_gen'],
    ['Intel(R) Xeon(R) Gold 6138 CPU @ 2.00GHz', 'skylake'],
    ['Intel(R) Xeon(R) Gold 6248R CPU @ 3.00GHz', 'cascade_lake'],
    ['Intel(R) Xeon(R) CPU E5-2630 v4 @ 2.20GHz', 'broadwell'],
    ['Intel Xeon E5-2690 v2', 'ivy_bridge'],
    ['Intel(R) Xeon(R) CPU E3-1220 @ 3.10GHz', 'sandy_bridge'],
    ['Intel Xeon E-2146G', 'coffee_lake'],
    ['Intel(R) Core(TM) i7-6700 CPU @ 3.40GHz', 'coffee_lake'],
    ['Intel(R) Core(TM) i5-4590 CPU @ 3.30GHz', 'haswell'],
    ['Intel Xeon Processor (Cascadelake)', 'cascade_lake'],
    ['Intel Xeon Processor (Skylake, IBRS)', 'skylake'],
    ['Intel Core Processor (Broadwell, IBRS)', 'broadwell'],
    ['AMD Ryzen 7 3700X 8-Core Processor', 'epyc_2nd_gen'],
    ['AMD Ryzen 5 3400G with Radeon Vega Graphics', 'epyc_1st_gen'],
    ['AMD Ryzen 9 5950X 16-Core Processor', 'epyc_3rd_gen'],
    // no generation the table measures
    ['AMD EPYC 9655 96-Core Processor', null],
    ['AMD EPYC Processor', null],
    ['AMD Epyc', null],
    ['Intel Xeon Platinum 8000', null],
    ['Intel(R) Xeon(R) CPU W3530 @ 2.80GHz', null],
    ['Intel(R) Core(TM) i5-1340P', null],
    ['AMD Ryzen 7 5800U with Radeon Graphics', null],
    ['QEMU Virtual CPU version 2.5+', null],
    ['Common KVM processor', null],
    ['Intel(R) Celeron(R) CPU N3050 @ 1.60GHz', null],
    ['ARMv7 Processor rev 4 (v7l)', null]
  ]
  for (const [cpu_model, generation] of cases) {
    it(`maps ${cpu_model} to ${generation}`, () => {
      expect(get_cpu_generation(cpu_model)).to.equal(generation)
    })
  }
})

describe('estimate_hardware_power_watts', () => {
  it('sums CPU at its utilization, memory and storage', () => {
    const { min, max } = CPU_WATTS_PER_VCPU.epyc_2nd_gen
    const estimate = estimate_hardware_power_watts({
      cpu_model: 'AMD EPYC-Rome Processor',
      logical_cpus: 8,
      memory_bytes: 16 * 1024 ** 3,
      storage: [
        { kind: 'ssd', bytes: 400e9 },
        { kind: 'hdd', bytes: 2e12 }
      ],
      cpu_utilization_basis_points: 2000
    })
    expect(estimate.cpu_generation).to.equal('epyc_2nd_gen')
    expect(estimate.power_watts).to.be.closeTo(
      8 * (min + 0.2 * (max - min)) + 16 * 0.392 + 0.4 * 1.2 + 2 * 0.65,
      1e-9
    )
  })

  it('returns null for a CPU whose generation is unknown', () => {
    expect(
      estimate_hardware_power_watts({
        cpu_model: 'QEMU Virtual CPU version 2.5+',
        logical_cpus: 2,
        memory_bytes: 4 * 1024 ** 3,
        storage: [],
        cpu_utilization_basis_points: 1000
      })
    ).to.equal(null)
  })
})
