// Registry of network event types served by /api/network/events and written
// by the detectors. Shared by the client and the server, so it must stay free
// of node-only imports. Each type is added by the task that produces it, so
// the registry never holds a type nothing can emit.

// A telemetry field is settled when one value holds in every snapshot of this
// window. A field that alternates or changes inside it emits nothing.
export const REPRESENTATIVE_TELEMETRY_SETTLE_MINUTES = 60

// A representative is behind when its cemented_behind exceeds this. Shared
// with the Alerts tab through common/representative-alert-rules.mjs.
export const REPRESENTATIVE_CEMENTED_BEHIND_BLOCKS = 1000

export const NETWORK_EVENT_KINDS = {
  condition: 'condition',
  occurrence: 'occurrence'
}

export const NETWORK_EVENT_PHASES = {
  began: 'began',
  ended: 'ended',
  occurred: 'occurred'
}

export const NETWORK_EVENT_SEVERITIES = ['info', 'warning', 'critical']

const PHASES_BY_KIND = {
  [NETWORK_EVENT_KINDS.condition]: [
    NETWORK_EVENT_PHASES.began,
    NETWORK_EVENT_PHASES.ended
  ],
  [NETWORK_EVENT_KINDS.occurrence]: [NETWORK_EVENT_PHASES.occurred]
}

// network_event_id_keys name the subject fields that make up an event's
// identity. A key is read from the event's columns first, then its evidence.
// An ended event reuses its began keys, so each pair is linked.
export const NETWORK_EVENT_TYPES = {
  representative_multiple_peer_addresses: {
    label: 'Multiple peer addresses',
    kind: NETWORK_EVENT_KINDS.condition,
    severity: 'info',
    public: true,
    network_event_id_keys: ['representative_account', 'began_at']
  },
  representative_peer_address_changed: {
    label: 'Peer address changed',
    kind: NETWORK_EVENT_KINDS.occurrence,
    severity: 'info',
    public: true,
    network_event_id_keys: [
      'representative_account',
      'peer_address',
      'observed_at'
    ]
  },
  representative_node_changed: {
    label: 'Node changed',
    kind: NETWORK_EVENT_KINDS.occurrence,
    severity: 'info',
    public: true,
    network_event_id_keys: ['representative_account', 'node_id', 'observed_at']
  },
  representative_version_outdated: {
    label: 'Outdated node version',
    kind: NETWORK_EVENT_KINDS.condition,
    severity: 'warning',
    public: true,
    network_event_id_keys: [
      'representative_account',
      'maker',
      'major_version',
      'began_at'
    ]
  },
  representative_cemented_behind: {
    label: 'Cemented behind',
    kind: NETWORK_EVENT_KINDS.condition,
    severity: 'warning',
    public: true,
    network_event_id_keys: ['representative_account', 'began_at']
  },
  // Operator-only: the API never serves this type.
  representative_rpc_control_enabled: {
    label: 'RPC control enabled',
    kind: NETWORK_EVENT_KINDS.condition,
    severity: 'critical',
    public: false,
    network_event_id_keys: ['representative_account', 'began_at']
  }
}

export const PUBLIC_NETWORK_EVENT_TYPES = Object.keys(
  NETWORK_EVENT_TYPES
).filter((network_event_type) => NETWORK_EVENT_TYPES[network_event_type].public)

export const get_network_event_type = (network_event_type) =>
  Object.prototype.hasOwnProperty.call(NETWORK_EVENT_TYPES, network_event_type)
    ? NETWORK_EVENT_TYPES[network_event_type]
    : null

export const is_public_network_event_type = (network_event_type) =>
  Boolean(get_network_event_type(network_event_type)?.public)

export const is_valid_network_event_phase = ({
  network_event_type,
  network_event_phase
}) => {
  const event_type = get_network_event_type(network_event_type)
  if (!event_type) return false
  return PHASES_BY_KIND[event_type.kind].includes(network_event_phase)
}

export const resolve_network_event_severity = ({
  network_event_type,
  severity
}) => severity || get_network_event_type(network_event_type)?.severity || null
