import { readFileSync, readdirSync } from 'fs'
import os from 'os'

// Reads the details of the host the node runs on, for a
// set_representative_hardware message. Linux only: every value comes from
// Node's os module or a read of /proc, /sys or a container marker file, with
// no subprocess. Nothing is sent until the operator confirms.

// The kernel's userspace clock tick (USER_HZ), the unit of the /proc/<pid>/stat
// times: fixed at 100 by the ABI of every architecture Node runs on
const CLOCK_TICKS_PER_SECOND = 100

// The CPU name from /proc/cpuinfo: x86 "model name", else ARM "Model" or
// "Hardware"
export function parse_cpu_model(cpuinfo) {
  for (const field of ['model name', 'Model', 'Hardware']) {
    const match = cpuinfo.match(new RegExp(`^${field}\\s*:\\s*(.+)$`, 'm'))
    if (match) {
      return match[1].trim()
    }
  }
  return null
}

// Average utilization since boot from the aggregate cpu line of /proc/stat.
// Time the hypervisor stole is not the guest's own work or idle time, so it
// is left out of both.
export function parse_cpu_utilization_basis_points(stat) {
  const line = stat.split('\n').find((row) => row.startsWith('cpu '))
  const [user, nice, system, idle, iowait, irq, softirq] = line
    .trim()
    .split(/\s+/)
    .slice(1)
    .map(Number)
  const busy = user + nice + system + irq + softirq
  const total = busy + idle + iowait
  return total ? Math.round((busy / total) * 10000) : 0
}

// The nano_node process's average share of the host's CPU capacity since it
// started, from its /proc/<pid>/stat, or null when no node process is found
export function parse_node_cpu_utilization_basis_points({
  process_stat,
  uptime_seconds,
  clock_ticks_per_second = CLOCK_TICKS_PER_SECOND,
  logical_cpus
}) {
  // Fields after the parenthesized command name; utime and stime are fields
  // 14 and 15, starttime field 22
  const fields = process_stat
    .slice(process_stat.lastIndexOf(')') + 2)
    .split(' ')
  const cpu_seconds =
    (Number(fields[11]) + Number(fields[12])) / clock_ticks_per_second
  const elapsed_seconds =
    uptime_seconds - Number(fields[19]) / clock_ticks_per_second
  if (!(elapsed_seconds > 0)) {
    return null
  }
  return Math.min(
    10000,
    Math.round((cpu_seconds / (elapsed_seconds * logical_cpus)) * 10000)
  )
}

// A file's trimmed contents, or null when it cannot be read
const read_file = (path) => {
  try {
    return readFileSync(path, 'utf8').trim()
  } catch {
    return null
  }
}

// Physical disks from /sys/block, the set `lsblk -d` lists as disk: a block
// device backed by hardware has a device link, which loop, device-mapper, md
// and zram devices lack. A SCSI optical drive (type 5) is not storage. The
// size file counts 512-byte sectors whatever the disk's block size.
export function read_storage({ sys_block = '/sys/block' } = {}) {
  const read = read_file
  let names
  try {
    names = readdirSync(sys_block)
  } catch {
    return []
  }
  return names
    .filter((name) => read(`${sys_block}/${name}/device/uevent`) !== null)
    .filter((name) => read(`${sys_block}/${name}/device/type`) !== '5')
    .map((name) => ({
      kind:
        read(`${sys_block}/${name}/queue/rotational`) === '1' ? 'hdd' : 'ssd',
      bytes: Number(read(`${sys_block}/${name}/size`)) * 512
    }))
    .filter(({ bytes }) => Number.isSafeInteger(bytes) && bytes > 0)
}

// DMI vendor and product prefixes, as systemd-detect-virt matches them
const DMI_VIRTUALIZATION = [
  ['KVM', 'kvm'],
  ['OpenStack', 'kvm'],
  ['KubeVirt', 'kvm'],
  ['Amazon EC2', 'amazon'],
  ['QEMU', 'qemu'],
  ['VMware', 'vmware'],
  ['VMW', 'vmware'],
  ['innotek GmbH', 'oracle'],
  ['VirtualBox', 'oracle'],
  ['Oracle Corporation', 'oracle'],
  ['Xen', 'xen'],
  ['Bochs', 'bochs'],
  ['Parallels', 'parallels'],
  ['BHYVE', 'bhyve'],
  ['Hyper-V', 'microsoft'],
  ['Apple Virtualization', 'apple'],
  ['Google Compute Engine', 'google']
]

// The virtualization in the names systemd-detect-virt prints, read from files
// rather than by running it: a container first, then a hypervisor from DMI,
// the device tree, the guest clock source or the x86 hypervisor CPU flag. An
// x86 host with none of them is bare metal; elsewhere their absence proves
// nothing, so it is unknown.
export function detect_virtualization({
  read = read_file,
  arch = process.arch
} = {}) {
  const container =
    read('/run/systemd/container') ||
    (read('/proc/1/environ') || '')
      .split('\0')
      .find((entry) => entry.startsWith('container='))
      ?.slice('container='.length)
  if (container) {
    return /^[a-z0-9-]{1,32}$/.test(container) ? container : 'container-other'
  }
  if (read('/run/.containerenv') !== null) return 'podman'
  if (read('/.dockerenv') !== null) return 'docker'
  if (/microsoft/i.test(read('/proc/sys/kernel/osrelease') || '')) return 'wsl'

  if (read('/sys/hypervisor/type') === 'xen') return 'xen'
  const product_name = read('/sys/class/dmi/id/product_name') || ''
  const sys_vendor = read('/sys/class/dmi/id/sys_vendor') || ''
  if (sys_vendor === 'Amazon EC2' && product_name.endsWith('.metal')) {
    return 'none'
  }
  if (
    sys_vendor === 'Microsoft Corporation' &&
    product_name === 'Virtual Machine'
  ) {
    return 'microsoft'
  }
  const dmi = [
    product_name,
    sys_vendor,
    read('/sys/class/dmi/id/board_vendor') || '',
    read('/sys/class/dmi/id/bios_vendor') || ''
  ]
  for (const [prefix, name] of DMI_VIRTUALIZATION) {
    if (dmi.some((value) => value.startsWith(prefix))) return name
  }

  const device_tree_hypervisor =
    read('/proc/device-tree/hypervisor/compatible') || ''
  if (device_tree_hypervisor.includes('kvm')) return 'kvm'
  if (device_tree_hypervisor.includes('xen')) return 'xen'

  const clock_sources =
    read(
      '/sys/devices/system/clocksource/clocksource0/available_clocksource'
    ) || ''
  if (clock_sources.includes('kvm-clock')) return 'kvm'
  if (clock_sources.includes('hyperv_clocksource')) return 'microsoft'
  if (/^flags\s*:.*\bhypervisor\b/m.test(read('/proc/cpuinfo') || '')) {
    return 'vm-other'
  }
  return arch === 'x64' || arch === 'ia32' ? 'none' : 'unknown'
}

const find_node_process_stat = () => {
  for (const pid of readdirSync('/proc').filter((name) => /^\d+$/.test(name))) {
    if (read_file(`/proc/${pid}/comm`) === 'nano_node') {
      // null when the process exited while being read
      return read_file(`/proc/${pid}/stat`)
    }
  }
  return null
}

export default function collect_host_hardware() {
  if (process.platform !== 'linux') {
    throw new Error(
      'report-representative-hardware runs on the Linux host of the node'
    )
  }
  const read = (path) => readFileSync(path, 'utf8')
  const logical_cpus = os.cpus().length
  const uptime_seconds = Number(read('/proc/uptime').split(' ')[0])
  const process_stat = find_node_process_stat()
  return {
    cpu_model: parse_cpu_model(read('/proc/cpuinfo')),
    logical_cpus,
    memory_bytes: os.totalmem(),
    storage: read_storage(),
    virtualization: detect_virtualization(),
    cpu_utilization_basis_points: parse_cpu_utilization_basis_points(
      read('/proc/stat')
    ),
    utilization_window_seconds: Math.floor(uptime_seconds),
    node_cpu_utilization_basis_points: process_stat
      ? parse_node_cpu_utilization_basis_points({
          process_stat,
          uptime_seconds,
          logical_cpus
        })
      : null
  }
}
