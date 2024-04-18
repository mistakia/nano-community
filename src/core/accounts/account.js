import { Record, Map, List } from 'immutable'

export const Account = new Record({
  account_is_loaded: false,
  account_is_loading: true,

  account_is_loading_open: true,
  account_is_loading_blocks_change_summary: true,
  account_is_loading_blocks_send_summary: true,
  account_is_loading_balance_history: false,
  account_is_loading_blocks_per_day: false,

  account: null,
  alias: null,
  watt_hour: null,
  representative: false,
  last_seen: null,
  account_meta: new Map(),
  stats: new Map(),
  representative_meta: new Map(),
  telemetry_history: new List(),
  uptime: new List(),
  uptime_summary: new Map(),
  network: new Map(),
  telemetry: new Map(),
  delegators: new List(),
  open: new Map(),
  balance_history: new List(),
  blocks_per_day: new List(),

  blocks_summary: new Map(),

  last_online: null,
  last_offline: null,
  is_online: false,

  version: null
})

export function createAccount({
  account_meta,
  stats,
  representative_meta,
  telemetry_history,
  uptime,
  uptime_summary,
  network,
  telemetry,
  delegators,
  open,
  balance_history,
  blocks_per_day,
  blocks_summary,
  ...data
}) {
  const { major_version, minor_version, patch_version, pre_release_version } =
    telemetry
  const { last_online, last_offline } = data

  const is_online = last_online && last_online > last_offline
  const version = major_version
    ? `${major_version}.${minor_version}.${patch_version}.${pre_release_version}`
    : 'unknown'

  return new Account({
    ...data,
    account_meta: new Map(account_meta),
    stats: new Map(stats),
    representative_meta: new Map(representative_meta),
    telemetry_history: new List(telemetry_history),
    uptime: new List(uptime),
    uptime_summary: new Map(uptime_summary),
    network: new Map(network),
    telemetry: new Map(telemetry),
    delegators: new List(delegators),
    open: new Map(open),
    balance_history: new List(balance_history),
    blocks_per_day: new List(blocks_per_day),
    blocks_summary: new Map(blocks_summary),
    is_online,
    version,
    account_is_loaded: true
  })
}
