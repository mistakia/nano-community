import { execFileSync } from 'child_process'
import { readFileSync, readdirSync } from 'fs'
import os from 'os'

// Reads the details of the host the node runs on, for a
// set_representative_hardware message. Linux only: every value comes from
// /proc, lsblk and systemd-detect-virt. Nothing is sent until the operator
// confirms.

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

// Physical disks from `lsblk -b -d -n -o SIZE,ROTA,TYPE`
export function parse_lsblk(output) {
  return output
    .split('\n')
    .map((row) => row.trim().split(/\s+/))
    .filter(([size, , type]) => size && type === 'disk' && Number(size) > 0)
    .map(([size, rotational]) => ({
      kind: rotational === '1' ? 'hdd' : 'ssd',
      bytes: Number(size)
    }))
}

// The nano_node process's average share of the host's CPU capacity since it
// started, from its /proc/<pid>/stat, or null when no node process is found
export function parse_node_cpu_utilization_basis_points({
  process_stat,
  uptime_seconds,
  clock_ticks_per_second,
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

const read = (path) => readFileSync(path, 'utf8')

const run = (command, args) => {
  try {
    return execFileSync(command, args, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore']
    }).trim()
  } catch (error) {
    // systemd-detect-virt exits 1 when it prints "none"
    return error.stdout ? String(error.stdout).trim() : null
  }
}

const find_node_process_stat = () => {
  for (const pid of readdirSync('/proc').filter((name) => /^\d+$/.test(name))) {
    try {
      if (read(`/proc/${pid}/comm`).trim() === 'nano_node') {
        return read(`/proc/${pid}/stat`)
      }
    } catch (error) {
      // the process exited while being read
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
  const logical_cpus = os.cpus().length
  const uptime_seconds = Number(read('/proc/uptime').split(' ')[0])
  const process_stat = find_node_process_stat()
  return {
    cpu_model: parse_cpu_model(read('/proc/cpuinfo')),
    logical_cpus,
    memory_bytes: os.totalmem(),
    storage: parse_lsblk(
      run('lsblk', ['-b', '-d', '-n', '-o', 'SIZE,ROTA,TYPE']) || ''
    ),
    virtualization: run('systemd-detect-virt', []) || 'unknown',
    cpu_utilization_basis_points: parse_cpu_utilization_basis_points(
      read('/proc/stat')
    ),
    utilization_window_seconds: Math.floor(uptime_seconds),
    node_cpu_utilization_basis_points: process_stat
      ? parse_node_cpu_utilization_basis_points({
          process_stat,
          uptime_seconds,
          clock_ticks_per_second: Number(run('getconf', ['CLK_TCK']) || 100),
          logical_cpus
        })
      : null
  }
}
