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
  network: new Map(),
  telemetry: new Map()
})
