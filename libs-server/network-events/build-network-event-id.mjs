import crypto from 'crypto'

import { get_network_event_type } from '#common/network-event-types.mjs'

// A key is read from the event's columns first, then its evidence, so a
// condition's began_at (kept in evidence) links its began and ended rows.
const read_network_event_key = ({ network_event, key }) => {
  const value =
    network_event[key] !== undefined && network_event[key] !== null
      ? network_event[key]
      : network_event.evidence?.[key]
  if (value === undefined || value === null) {
    throw new Error(
      `network event ${network_event.network_event_type} is missing identity key ${key}`
    )
  }
  return typeof value === 'string' ? value.trim() : value
}

// sha256 over the type, the phase and the registry's identity keys, so a
// replayed event gets the same id and dedupes on insert.
const build_network_event_id = (network_event) => {
  const event_type = get_network_event_type(network_event.network_event_type)
  if (!event_type) {
    throw new Error(
      `unknown network_event_type ${network_event.network_event_type}`
    )
  }

  const identity = [
    network_event.network_event_type,
    network_event.network_event_phase,
    ...event_type.network_event_id_keys.map((key) =>
      read_network_event_key({ network_event, key })
    )
  ]

  return crypto
    .createHash('sha256')
    .update(JSON.stringify(identity))
    .digest('hex')
}

export default build_network_event_id
