// Estimates a host's power from its own reported hardware with the Cloud
// Carbon Footprint method:
// https://www.cloudcarbonfootprint.org/docs/methodology
//
// The per-vCPU watts are vendored from ccf-coefficients (Apache-2.0),
// output/coefficients-aws-use.csv, which derives them from SPECpower_ssj2008
// results. EPYC 5th Gen is left out: its row is about five times the adjacent
// generations. The Graviton rows are left out: they copy EPYC 2nd Gen.
export const CPU_WATTS_PER_VCPU = {
  sandy_bridge: {
    name: 'Sandy Bridge',
    min: 2.212243200231481,
    max: 8.630870594765684
  },
  ivy_bridge: {
    name: 'Ivy Bridge',
    min: 1.7074305555555556,
    max: 5.5569444444444445
  },
  haswell: { name: 'Haswell', min: 1.8573529411764707, max: 5.595383986928105 },
  broadwell: {
    name: 'Broadwell',
    min: 0.7128342245989305,
    max: 3.685327540106952
  },
  skylake: { name: 'Skylake', min: 0.6129888539040325, max: 4.104170352960531 },
  coffee_lake: {
    name: 'Coffee Lake',
    min: 1.138425925925926,
    max: 5.421759259259259
  },
  cascade_lake: {
    name: 'Cascade Lake',
    min: 0.6902978319127387,
    max: 4.063193520161689
  },
  ice_lake: { name: 'Ice Lake', min: 0.766796875, max: 3.7582031249999996 },
  sapphire_rapids: {
    name: 'Sapphire Rapids',
    min: 1.0362861003136936,
    max: 4.160476336606656
  },
  emerald_rapids: {
    name: 'Emerald Rapids',
    min: 0.8140104166666666,
    max: 4.48203125
  },
  granite_rapids: {
    name: 'Granite Rapids',
    min: 0.5815883902616279,
    max: 2.5274707237711422
  },
  epyc_1st_gen: {
    name: 'EPYC 1st Gen',
    min: 0.8467881944444444,
    max: 2.6041666666666665
  },
  epyc_2nd_gen: {
    name: 'EPYC 2nd Gen',
    min: 0.4742621527777777,
    max: 1.6929615162037035
  },
  epyc_3rd_gen: {
    name: 'EPYC 3rd Gen',
    min: 0.45562453497023814,
    max: 1.957333519345238
  },
  epyc_4th_gen: {
    name: 'EPYC 4th Gen',
    min: 0.7391482469512195,
    max: 2.282155106707317
  }
}

// Cloud Carbon Footprint: 0.000392 kWh per GB-hour of memory, and 1.2 and
// 0.65 Wh per TB-hour of SSD and HDD storage
const MEMORY_WATTS_PER_GB = 0.392
const STORAGE_WATTS_PER_TB = { ssd: 1.2, hdd: 0.65 }

const GB = 1024 ** 3
const TB = 1000 ** 4

const XEON_SCALABLE_GENERATIONS = {
  1: 'skylake',
  2: 'cascade_lake',
  3: 'ice_lake',
  4: 'sapphire_rapids',
  5: 'emerald_rapids'
}
const XEON_E_VERSIONS = {
  '': 'sandy_bridge',
  2: 'ivy_bridge',
  3: 'haswell',
  4: 'broadwell'
}
const XEON_E3_VERSIONS = {
  '': 'sandy_bridge',
  2: 'ivy_bridge',
  3: 'haswell',
  4: 'broadwell',
  5: 'coffee_lake',
  6: 'coffee_lake'
}
// The core design of a Core i3/i5/i7/i9 by generation. The 6th to 10th
// generations share the Skylake core on the client die that the Coffee Lake
// row measures. Later generations have no row.
const CORE_GENERATIONS = {
  2: 'sandy_bridge',
  3: 'ivy_bridge',
  4: 'haswell',
  5: 'broadwell',
  6: 'coffee_lake',
  7: 'coffee_lake',
  8: 'coffee_lake',
  9: 'coffee_lake',
  10: 'coffee_lake'
}
const EPYC_GENERATIONS = {
  1: 'epyc_1st_gen',
  2: 'epyc_2nd_gen',
  3: 'epyc_3rd_gen',
  4: 'epyc_4th_gen'
}
// Desktop Ryzen and Threadripper share their core design with an EPYC
// generation: Zen and Zen+ with the 1st, Zen 2 with the 2nd, Zen 3 with the
// 3rd and Zen 4 with the 4th. Mobile parts are left out.
const RYZEN_DESKTOP_SERIES = {
  1: 'epyc_1st_gen',
  2: 'epyc_1st_gen',
  3: 'epyc_2nd_gen',
  5: 'epyc_3rd_gen',
  7: 'epyc_4th_gen'
}
const RYZEN_APU_SERIES = {
  2: 'epyc_1st_gen',
  3: 'epyc_1st_gen',
  4: 'epyc_2nd_gen',
  5: 'epyc_3rd_gen',
  8: 'epyc_4th_gen'
}
const THREADRIPPER_SERIES = {
  1: 'epyc_1st_gen',
  2: 'epyc_1st_gen',
  3: 'epyc_2nd_gen',
  5: 'epyc_3rd_gen',
  7: 'epyc_4th_gen'
}
// The CPU models a KVM guest is shown, by their QEMU names
const KVM_MODELS = {
  'epyc-rome': 'epyc_2nd_gen',
  'epyc-milan': 'epyc_3rd_gen',
  'epyc-genoa': 'epyc_4th_gen',
  sandybridge: 'sandy_bridge',
  ivybridge: 'ivy_bridge',
  haswell: 'haswell',
  broadwell: 'broadwell',
  cascadelake: 'cascade_lake',
  icelake: 'ice_lake',
  sapphirerapids: 'sapphire_rapids'
}

// Each rule matches a normalized CPU name and returns a generation key or null
const CPU_RULES = [
  // Xeon Bronze/Silver/Gold/Platinum: the second digit is the generation
  [
    /xeon(?: \(r\))? (?:bronze|silver|gold|platinum) \d(\d)\d\d/,
    ([, generation]) => XEON_SCALABLE_GENERATIONS[generation]
  ],
  [
    /xeon .*\be3-?\s?1\d\d\d[a-z]?(?: v(\d))?\b/,
    ([, v = '']) => XEON_E3_VERSIONS[v]
  ],
  [
    /xeon .*\be5-?\s?[124]\d\d\d[a-z]?(?: v(\d))?\b/,
    ([, v = '']) => XEON_E_VERSIONS[v]
  ],
  [/xeon .*\be-?2[12]\d\d[a-z]*\b/, () => 'coffee_lake'],
  [
    /\bcore (?:\(tm\) )?i[3579]-(\d{1,2}?)\d{3}[a-z]*\b/,
    ([, g]) => CORE_GENERATIONS[g]
  ],
  // QEMU names: "Intel Xeon Processor (Cascadelake)", "AMD EPYC-Rome Processor"
  [/\b(epyc-(?:rome|milan|genoa))\b/, ([, model]) => KVM_MODELS[model]],
  [
    /\((sandybridge|ivybridge|haswell|broadwell|cascadelake|icelake|sapphirerapids)\b/,
    ([, model]) => KVM_MODELS[model]
  ],
  [/xeon processor \(skylake\b/, () => 'skylake'],
  [/core processor \(skylake\b/, () => 'coffee_lake'],
  // EPYC 7282, 7B13, 9654, 4464P, "7002 series": the last digit of the
  // model number is the generation
  [/\bepyc \d[\da-z]\d(\d)[a-z]*\b/, ([, g]) => EPYC_GENERATIONS[g]],
  [
    /\bthreadripper (?:pro )?(\d)\d{2,3}[a-z]*\b/,
    ([, s]) => THREADRIPPER_SERIES[s]
  ],
  [/\bryzen \d (?:pro )?(\d)\d{3}g[e]?\b/, ([, s]) => RYZEN_APU_SERIES[s]],
  [
    /\bryzen \d (?:pro )?(\d)\d{3}(?:x3d|x|)\b(?! ?[uh])/,
    ([, s]) => RYZEN_DESKTOP_SERIES[s]
  ]
]

const normalize_cpu_model = (cpu_model) =>
  cpu_model
    .toLowerCase()
    .replace(/\((r|tm)\)/g, ' ')
    .replace(/-core processor/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

// The generation key in CPU_WATTS_PER_VCPU for a CPU name, or null when the
// name does not identify a generation the table measures
export function get_cpu_generation(cpu_model) {
  if (typeof cpu_model !== 'string') {
    return null
  }
  const name = normalize_cpu_model(cpu_model)
  for (const [pattern, resolve] of CPU_RULES) {
    const match = name.match(pattern)
    if (match) {
      return resolve(match) || null
    }
  }
  return null
}

// The host's estimated average power in watts, or null when its CPU generation
// cannot be identified. Takes the content of a set_representative_hardware
// message.
export function estimate_hardware_power_watts({
  cpu_model,
  logical_cpus,
  memory_bytes,
  storage,
  cpu_utilization_basis_points
}) {
  const generation = get_cpu_generation(cpu_model)
  if (!generation) {
    return null
  }
  const { min, max } = CPU_WATTS_PER_VCPU[generation]
  const utilization = cpu_utilization_basis_points / 10000
  const cpu_watts = logical_cpus * (min + utilization * (max - min))
  const memory_watts = (memory_bytes / GB) * MEMORY_WATTS_PER_GB
  const storage_watts = storage.reduce(
    (sum, { kind, bytes }) => sum + (bytes / TB) * STORAGE_WATTS_PER_TB[kind],
    0
  )
  return {
    power_watts: cpu_watts + memory_watts + storage_watts,
    cpu_generation: generation
  }
}
