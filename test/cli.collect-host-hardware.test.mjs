/* global describe it */
import chai from 'chai'

import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'fs'
import os from 'os'
import path from 'path'

import {
  detect_virtualization,
  parse_cpu_model,
  parse_cpu_utilization_basis_points,
  parse_node_cpu_utilization_basis_points,
  read_storage
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
    expect(parse_cpu_model('processor\t: 0\nHardware\t: BCM2835\n')).to.equal(
      'BCM2835'
    )
    expect(parse_cpu_model('processor\t: 0\n')).to.equal(null)
  })

  it('averages utilization since boot, leaving out stolen time', () => {
    // user nice system idle iowait irq softirq steal
    const stat = 'cpu  200 0 100 600 100 0 0 1000 0 0\ncpu0 1 2 3 4\n'
    expect(parse_cpu_utilization_basis_points(stat)).to.equal(3000)
    // irq and softirq are busy time too
    expect(
      parse_cpu_utilization_basis_points('cpu  100 0 100 600 0 100 100 0\n')
    ).to.equal(4000)
  })

  it('lists physical disks by kind from /sys/block', () => {
    const sys_block = mkdtempSync(path.join(os.tmpdir(), 'sys-block-'))
    const device = (
      name,
      { sectors, rotational, scsi_type, hardware = true }
    ) => {
      mkdirSync(path.join(sys_block, name, 'queue'), { recursive: true })
      writeFileSync(path.join(sys_block, name, 'size'), `${sectors}\n`)
      writeFileSync(
        path.join(sys_block, name, 'queue', 'rotational'),
        `${rotational}\n`
      )
      if (hardware) {
        mkdirSync(path.join(sys_block, name, 'device'))
        writeFileSync(path.join(sys_block, name, 'device', 'uevent'), '')
        if (scsi_type !== undefined) {
          writeFileSync(
            path.join(sys_block, name, 'device', 'type'),
            `${scsi_type}\n`
          )
        }
      }
    }
    expect(
      read_storage({ sys_block: path.join(sys_block, 'absent') })
    ).to.deep.equal([])
    try {
      device('nvme0n1', { sectors: 781422768, rotational: 0 })
      device('sda', { sectors: 3907029168, rotational: 1, scsi_type: 0 })
      device('sr0', { sectors: 2097151, rotational: 1, scsi_type: 5 })
      device('loop0', { sectors: 204800, rotational: 0, hardware: false })
      device('dm-0', { sectors: 781422768, rotational: 0, hardware: false })
      device('zram0', { sectors: 8388608, rotational: 0, hardware: false })
      device('sdb', { sectors: 0, rotational: 1, scsi_type: 0 })
      expect(
        read_storage({ sys_block }).sort((a, b) => a.bytes - b.bytes)
      ).to.deep.equal([
        { kind: 'ssd', bytes: 400088457216 },
        { kind: 'hdd', bytes: 2000398934016 }
      ])
    } finally {
      rmSync(sys_block, { recursive: true })
    }
  })

  it('names the virtualization as systemd-detect-virt does', () => {
    const host = (files, arch = 'x64') => ({
      read: (file) => files[file] ?? null,
      arch
    })
    const cpuinfo = (flags) => `processor\t: 0\nflags\t\t: fpu ${flags}\n`
    expect(detect_virtualization(host({ '/.dockerenv': '' }))).to.equal(
      'docker'
    )
    expect(
      detect_virtualization(host({ '/run/systemd/container': 'lxc' }))
    ).to.equal('lxc')
    expect(
      detect_virtualization(
        host({ '/proc/1/environ': 'HOME=/\0container=Weird Value\0' })
      )
    ).to.equal('container-other')
    // A DMI vendor names a hypervisor only by its start
    expect(
      detect_virtualization(
        host({ '/sys/class/dmi/id/sys_vendor': 'Not KVM Inc' })
      )
    ).to.equal('none')
    expect(
      detect_virtualization(
        host(
          {
            '/sys/devices/system/clocksource/clocksource0/available_clocksource':
              'hyperv_clocksource_tsc_page acpi_pm'
          },
          'arm64'
        )
      )
    ).to.equal('microsoft')
    expect(
      detect_virtualization(
        host({
          '/sys/class/dmi/id/sys_vendor': 'QEMU',
          '/sys/class/dmi/id/product_name': 'Standard PC (Q35 + ICH9, 2009)',
          '/proc/cpuinfo': cpuinfo('hypervisor')
        })
      )
    ).to.equal('qemu')
    expect(
      detect_virtualization(
        host({
          '/sys/class/dmi/id/sys_vendor': 'Amazon EC2',
          '/sys/class/dmi/id/product_name': 'c5.metal'
        })
      )
    ).to.equal('none')
    expect(
      detect_virtualization(
        host({
          '/sys/class/dmi/id/sys_vendor': 'DigitalOcean',
          '/sys/devices/system/clocksource/clocksource0/available_clocksource':
            'kvm-clock tsc acpi_pm',
          '/proc/cpuinfo': cpuinfo('hypervisor')
        })
      )
    ).to.equal('kvm')
    expect(
      detect_virtualization(host({ '/proc/cpuinfo': cpuinfo('hypervisor') }))
    ).to.equal('vm-other')
    expect(detect_virtualization(host({ '/run/.containerenv': '' }))).to.equal(
      'podman'
    )
    expect(
      detect_virtualization(
        host({
          '/proc/sys/kernel/osrelease': '5.15.153.1-microsoft-standard-WSL2'
        })
      )
    ).to.equal('wsl')
    expect(
      detect_virtualization(host({ '/sys/hypervisor/type': 'xen' }))
    ).to.equal('xen')
    expect(
      detect_virtualization(
        host({
          '/sys/class/dmi/id/sys_vendor': 'Microsoft Corporation',
          '/sys/class/dmi/id/product_name': 'Virtual Machine'
        })
      )
    ).to.equal('microsoft')
    expect(
      detect_virtualization(
        host({
          '/sys/class/dmi/id/sys_vendor': 'Microsoft Corporation',
          '/sys/class/dmi/id/product_name': 'Surface Laptop 5',
          '/proc/cpuinfo': cpuinfo('sse2')
        })
      )
    ).to.equal('none')
    expect(
      detect_virtualization(host({ '/sys/class/dmi/id/bios_vendor': 'Xen' }))
    ).to.equal('xen')
    expect(
      detect_virtualization(
        host(
          { '/proc/device-tree/hypervisor/compatible': 'linux,kvm' },
          'arm64'
        )
      )
    ).to.equal('kvm')
    expect(detect_virtualization(host({}, 'arm64'))).to.equal('unknown')
    expect(
      detect_virtualization(
        host({
          '/sys/class/dmi/id/sys_vendor': 'Supermicro',
          '/proc/cpuinfo': cpuinfo('sse2')
        })
      )
    ).to.equal('none')
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
        logical_cpus: 4
      })
    ).to.equal(100)
    // More CPU time than capacity caps at all of it, and a process that
    // started at or after the uptime has no window
    expect(
      parse_node_cpu_utilization_basis_points({
        process_stat,
        uptime_seconds: 101,
        logical_cpus: 1
      })
    ).to.equal(10000)
    expect(
      parse_node_cpu_utilization_basis_points({
        process_stat,
        uptime_seconds: 100,
        logical_cpus: 4
      })
    ).to.equal(null)
  })
})
