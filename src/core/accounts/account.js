import { Record, Map, List } from 'immutable'

export const Account = new Record({
  account: null,
  alias: null,
  watt_hour: null,
  representative: false,
  last_seen: null,
  meta: new Map(),
  uptime: new List(),
  telemetry: new Map()
})
