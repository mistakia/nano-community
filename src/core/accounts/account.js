import { Record, Map, List } from 'immutable'

export const Account = new Record({
  account: null,
  alias: null,
  watt_hour: null,
  representative: false,
  last_seen: null,
  account_meta: new Map(),
  representative_meta: new Map(),
  telemetry_history: new List(),
  uptime: new List(),
  uptime_summary: new Map(),
  network: new Map(),
  telemetry: new Map(),
  delegators: new List(),

  last_online: null,
  last_offline: null,
  is_online: false,

  version: null
})

export function createAccount(data) {
  /* eslint-disable camelcase */
  const {
    major_version,
    minor_version,
    patch_version,
    pre_release_version
  } = data.telemetry
  const { last_online, last_offline } = data

  const is_online = last_online && last_online > last_offline
  const version = major_version
    ? `${major_version}.${minor_version}.${patch_version}.${pre_release_version}`
    : 'unknown'
  /* eslint-enable camelcase */

  return new Account({
    ...data,
    is_online,
    version
  })
}
