import { CommunityRequestError } from './verify-community-request.mjs'

export const STORAGE_KINDS = ['ssd', 'hdd']

// Utilization since boot over less than a day does not cover a daily cycle
export const MIN_UTILIZATION_WINDOW_SECONDS = 24 * 60 * 60

const MAX_CPU_MODEL_LENGTH = 200
const MAX_STORAGE_DEVICES = 64
const VIRTUALIZATION_RE = /^[a-z0-9-]{1,32}$/

const CONTENT_KEYS = [
  'cpu_model',
  'logical_cpus',
  'memory_bytes',
  'storage',
  'virtualization',
  'cpu_utilization_basis_points',
  'utilization_window_seconds',
  'node_cpu_utilization_basis_points'
]

const reject = (message) => {
  throw new CommunityRequestError(400, message)
}

const is_positive_integer = (value) => Number.isSafeInteger(value) && value > 0

const is_basis_points = (value) =>
  Number.isSafeInteger(value) && value >= 0 && value <= 10000

const is_plain_object = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value)

// Validates the parameters of a set_representative_hardware message: the
// details of the host a representative runs on, as the CLI collects them
export function parse_representative_hardware({ content, references }) {
  if (references.length) {
    reject('set_representative_hardware takes no references')
  }
  const keys = Object.keys(content)
  if (
    keys.length !== CONTENT_KEYS.length ||
    !CONTENT_KEYS.every((key) => keys.includes(key))
  ) {
    reject(
      `set_representative_hardware content must be exactly {${CONTENT_KEYS.join(', ')}}`
    )
  }

  const {
    cpu_model,
    logical_cpus,
    memory_bytes,
    storage,
    virtualization,
    cpu_utilization_basis_points,
    utilization_window_seconds,
    node_cpu_utilization_basis_points
  } = content
  if (
    typeof cpu_model !== 'string' ||
    !cpu_model.trim() ||
    cpu_model.length > MAX_CPU_MODEL_LENGTH
  ) {
    reject(
      `cpu_model must be a string of 1 to ${MAX_CPU_MODEL_LENGTH} characters`
    )
  }
  if (!is_positive_integer(logical_cpus)) {
    reject('logical_cpus must be a positive integer')
  }
  if (!is_positive_integer(memory_bytes)) {
    reject('memory_bytes must be a positive integer')
  }
  if (
    !Array.isArray(storage) ||
    storage.length > MAX_STORAGE_DEVICES ||
    !storage.every(
      (device) =>
        is_plain_object(device) &&
        Object.keys(device).length === 2 &&
        STORAGE_KINDS.includes(device.kind) &&
        is_positive_integer(device.bytes)
    )
  ) {
    reject(
      `storage must be at most ${MAX_STORAGE_DEVICES} devices of exactly {kind, bytes}, with kind ${STORAGE_KINDS.join(' or ')}`
    )
  }
  if (
    typeof virtualization !== 'string' ||
    !VIRTUALIZATION_RE.test(virtualization)
  ) {
    reject('virtualization must be the systemd-detect-virt name, or none')
  }
  if (!is_basis_points(cpu_utilization_basis_points)) {
    reject('cpu_utilization_basis_points must be an integer from 0 to 10000')
  }
  if (
    !Number.isSafeInteger(utilization_window_seconds) ||
    utilization_window_seconds < MIN_UTILIZATION_WINDOW_SECONDS
  ) {
    reject('the utilization window must be at least 24 hours of uptime')
  }
  if (
    node_cpu_utilization_basis_points !== null &&
    !is_basis_points(node_cpu_utilization_basis_points)
  ) {
    reject(
      'node_cpu_utilization_basis_points must be null or an integer from 0 to 10000'
    )
  }

  return content
}
