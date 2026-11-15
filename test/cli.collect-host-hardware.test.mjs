/* global describe it */
import chai from 'chai'

import {
  parse_cpu_model,
  parse_cpu_utilization_basis_points,
  parse_lsblk,
  parse_node_cpu_utilization_basis_points
} from '#root/cli/collect-host-hardware.mjs'

const expect = chai.expect

describe('collect-host-hardware parsers', () => {
  it('reads the CPU name on x86 and on ARM', () => {
    expect(
      parse_cpu_model(
        'processor\t: 0\nvendor_id\t: AuthenticAMD\nmodel name\t: AMD EPYC-Rome Processor\n'
      )
    ).to.equal('AMD EPYC-Rome Processor')
    expect(
      parse_cpu_model(
        'processor\t: 0\nModel\t\t: Raspberry Pi 4 Model B Rev 1.4\n'
      )
    ).to.equal('Raspberry Pi 4 Model B Rev 1.4')
    expect(parse_cpu_model('processor\t: 0\n')).to.equal(null)
  })

  it('averages utilization since boot, leaving out stolen time', () => {
    // user nice system idle iowait irq softirq steal
    const stat = 'cpu  200 0 100 600 100 0 0 1000 0 0\ncpu0 1 2 3 4\n'
    expect(parse_cpu_utilization_basis_points(stat)).to.equal(3000)
  })

  it('lists physical disks by kind', () => {
    const output =
      '400088457216 0 disk\n2000398934016 1 disk\n524288 0 rom\n0 0 disk\n'
    expect(parse_lsblk(output)).to.deep.equal([
      { kind: 'ssd', bytes: 400088457216 },
      { kind: 'hdd', bytes: 2000398934016 }
    ])
  })

  it("reads the node process's share of the host's CPU capacity", () => {
    // After "pid (comm) " come fields 3 onward, so field n is at n - 3:
    // utime 14 and stime 15 are 3000 and 1000 ticks, starttime 22 is 10000
    // ticks after boot. 40 CPU seconds over 1000 seconds on 4 CPUs is 1%.
    const fields = Array.from({ length: 50 }, () => '0')
    fields[0] = 'S'
    fields[11] = '3000'
    fields[12] = '1000'
    fields[19] = '10000'
    const process_stat = `1234 (nano_node) ${fields.join(' ')}`
    expect(
      parse_node_cpu_utilization_basis_points({
        process_stat,
        uptime_seconds: 1100,
        clock_ticks_per_second: 100,
        logical_cpus: 4
      })
    ).to.equal(100)
  })
})
