// Maps peers to the representatives they host. A vote with is_rebroadcast
// false came straight from the sending peer's own representative, so both
// crawler replies and flooded direct votes attribute a representative to a
// peer. Each representative is attributed to the peer it was last seen on,
// so one that moves between peers is never counted twice.

export const CRAWLER_ROUND_MINUTES = 5

// A peer's hosting is settled once its representative count has held for
// this long, and an attribution expires when the representative has not been
// seen on any peer for this long.
export const CRAWLER_SETTLE_MINUTES = 30
const SETTLE_MS = CRAWLER_SETTLE_MINUTES * 60 * 1000

const NETWORK_EVENT_TYPE = 'node_hosts_multiple_representatives'

const to_seconds = (ms) => Math.floor(ms / 1000)

// State is plain JSON so it can be saved and restored:
//   attributions     representative -> { peer_node_id, peer_address, seen_at_ms }
//   peer_tracking    peer_node_id -> { is_multiple, since_ms }
//   open_conditions  peer_node_id -> began keys and evidence
export const create_crawler_state = () => ({
  attributions: {},
  peer_tracking: {},
  open_conditions: {}
})

export const record_direct_vote = ({ state, vote }) => {
  if (vote.is_rebroadcast || !vote.peer_node_id) return
  const prior = state.attributions[vote.representative_account]
  if (prior && prior.seen_at_ms > vote.received_at_ms) return
  state.attributions[vote.representative_account] = {
    peer_node_id: vote.peer_node_id,
    peer_address: vote.peer_address,
    seen_at_ms: vote.received_at_ms
  }
}

const group_representatives_by_peer = ({ state, now_ms }) => {
  const representatives_by_peer = new Map()
  for (const [representative_account, attribution] of Object.entries(
    state.attributions
  )) {
    if (now_ms - attribution.seen_at_ms > SETTLE_MS) {
      delete state.attributions[representative_account]
      continue
    }
    const hosted = representatives_by_peer.get(attribution.peer_node_id) ?? {
      peer_address: attribution.peer_address,
      representative_accounts: []
    }
    hosted.representative_accounts.push(representative_account)
    representatives_by_peer.set(attribution.peer_node_id, hosted)
  }
  return representatives_by_peer
}

// Settles each peer's hosting and emits began when a peer has hosted two or
// more representatives for the settle window, and ended when it has hosted
// fewer for the settle window. A degraded observer loses sight of peers, so
// it judges nothing and its tracking stands until it recovers.
export const evaluate_peer_hosting = ({
  state,
  now_ms,
  is_degraded = false
}) => {
  if (is_degraded) return []
  const representatives_by_peer = group_representatives_by_peer({
    state,
    now_ms
  })
  const network_events = []
  const peer_node_ids = new Set([
    ...representatives_by_peer.keys(),
    ...Object.keys(state.peer_tracking),
    ...Object.keys(state.open_conditions)
  ])

  for (const peer_node_id of peer_node_ids) {
    const hosted = representatives_by_peer.get(peer_node_id)
    const is_multiple = (hosted?.representative_accounts.length ?? 0) >= 2
    const tracking = state.peer_tracking[peer_node_id]
    if (!tracking || tracking.is_multiple !== is_multiple) {
      state.peer_tracking[peer_node_id] = { is_multiple, since_ms: now_ms }
    }
    const since_ms = state.peer_tracking[peer_node_id].since_ms
    const is_settled = now_ms - since_ms >= SETTLE_MS
    const opened = state.open_conditions[peer_node_id]

    if (is_multiple && is_settled && !opened) {
      const began_at = to_seconds(since_ms)
      const began = {
        began_at,
        peer_address: hosted.peer_address,
        representative_accounts: [...hosted.representative_accounts].sort()
      }
      state.open_conditions[peer_node_id] = began
      network_events.push({
        network_event_type: NETWORK_EVENT_TYPE,
        network_event_phase: 'began',
        node_id: peer_node_id,
        peer_address: hosted.peer_address,
        evidence: { ...began, settle_minutes: CRAWLER_SETTLE_MINUTES },
        observed_at: began_at
      })
    } else if (!is_multiple && is_settled && opened) {
      delete state.open_conditions[peer_node_id]
      network_events.push({
        network_event_type: NETWORK_EVENT_TYPE,
        network_event_phase: 'ended',
        node_id: peer_node_id,
        peer_address: opened.peer_address,
        evidence: {
          remaining_representative_accounts: [
            ...(hosted?.representative_accounts ?? [])
          ].sort(),
          ...opened
        },
        observed_at: to_seconds(since_ms)
      })
    }

    if (!hosted && !state.open_conditions[peer_node_id] && is_settled) {
      delete state.peer_tracking[peer_node_id]
    }
  }
  return network_events
}

// Sends one confirm_req for the pair to every handshaken peer at once and
// returns each peer's reply: { peer_node_id, peer_address, requested_at_ms,
// votes }, where votes are that peer's direct votes for the pair.
export const crawl_representative_peers = async ({
  node,
  hash_root_pair,
  timeout_ms = 5000
}) => {
  const peers = node.get_peers()
  const replies = await Promise.all(
    peers.map(async ({ peer_node_id, peer_address }) => {
      try {
        const { requested_at_ms, votes } = await node.request_votes_from_peer({
          peer_node_id,
          hash_root_pairs: [hash_root_pair],
          timeout_ms
        })
        return { peer_node_id, peer_address, requested_at_ms, votes }
      } catch {
        return { peer_node_id, peer_address, requested_at_ms: null, votes: [] }
      }
    })
  )
  return {
    asked_peer_count: peers.length,
    replied_peer_count: replies.filter(({ votes }) => votes.length).length,
    replies
  }
}
