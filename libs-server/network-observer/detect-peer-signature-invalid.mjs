import { PEER_SIGNATURE_INVALID_WINDOW_MINUTES } from '#common/network-event-types.mjs'

const WINDOW_SECONDS = PEER_SIGNATURE_INVALID_WINDOW_MINUTES * 60

// Counts invalid signatures per peer in fixed windows of
// PEER_SIGNATURE_INVALID_WINDOW_MINUTES, so a flood from one peer is one
// event. A window's event is emitted once the window has closed, and an open
// window is saved with the observer state: an event emitted early would take
// the window's id, and the rest of its count would dedupe away.
// State is plain JSON: peer_address -> { window_began_at, count, ... }.
export const create_signature_state = () => ({ windows_by_peer: {} })

const get_window_began_at = (received_at_ms) =>
  Math.floor(received_at_ms / 1000 / WINDOW_SECONDS) * WINDOW_SECONDS

const build_window_event = ({ peer_address, window }) => ({
  network_event_type: 'peer_signature_invalid',
  network_event_phase: 'occurred',
  peer_address,
  node_id: window.peer_node_id,
  evidence: {
    window_began_at: window.window_began_at,
    window_minutes: PEER_SIGNATURE_INVALID_WINDOW_MINUTES,
    invalid_signature_count: window.count,
    message_types: window.message_types,
    signer_public_keys: window.signer_public_keys
  },
  observed_at: window.window_began_at
})

// Keeps at most this many distinct signer keys per window as evidence.
const SIGNER_KEY_SAMPLE_SIZE = 10

export const record_invalid_signature = ({ state, invalid_signature }) => {
  const { peer_address, received_at_ms, message_type, signer_public_key } =
    invalid_signature
  const window_began_at = get_window_began_at(received_at_ms)
  const network_events = []
  let window = state.windows_by_peer[peer_address]
  if (window && window.window_began_at !== window_began_at) {
    network_events.push(build_window_event({ peer_address, window }))
    window = null
  }
  if (!window) {
    window = {
      window_began_at,
      peer_node_id: invalid_signature.peer_node_id ?? null,
      count: 0,
      message_types: {},
      signer_public_keys: []
    }
    state.windows_by_peer[peer_address] = window
  }
  window.count += 1
  window.message_types[message_type] =
    (window.message_types[message_type] ?? 0) + 1
  window.peer_node_id =
    window.peer_node_id ?? invalid_signature.peer_node_id ?? null
  if (
    signer_public_key &&
    window.signer_public_keys.length < SIGNER_KEY_SAMPLE_SIZE &&
    !window.signer_public_keys.includes(signer_public_key)
  ) {
    window.signer_public_keys.push(signer_public_key)
  }
  return network_events
}

// Emits every window that closed before now_ms.
export const flush_signature_windows = ({ state, now_ms }) => {
  const current_window_began_at = get_window_began_at(now_ms)
  const network_events = []
  for (const [peer_address, window] of Object.entries(state.windows_by_peer)) {
    if (window.window_began_at < current_window_began_at) {
      network_events.push(build_window_event({ peer_address, window }))
      delete state.windows_by_peer[peer_address]
    }
  }
  return network_events
}
