// Attribute a telemetry node to the representative account it votes for.
//
// The rep crawler (confirmation_quorum peers) is the primary source: it names
// the account whose votes arrive on a channel, so a telemetry interface on that
// channel belongs to that account. A crawler match is rejected when the
// account's recently attributed node is a different node that is also in this
// telemetry round, since a rep that votes through a proxy or second interface
// would otherwise be pinned to the wrong node.
//
// When the crawler has no match, the account last attributed to this node_id
// in recent telemetry history is used. Each run writes its attribution back to
// representatives_telemetry, so the history maintains itself.
export default function resolve_telemetry_account({
  node_id,
  node_interfaces,
  rep_peers,
  history_account_by_node_id,
  live_node_ids
}) {
  const history_node_ids_by_account = new Map()
  for (const [history_node_id, account] of history_account_by_node_id) {
    if (!history_node_ids_by_account.has(account)) {
      history_node_ids_by_account.set(account, [])
    }
    history_node_ids_by_account.get(account).push(history_node_id)
  }

  for (const node_interface of node_interfaces) {
    const crawler_peer = Object.values(rep_peers).find(
      (peer) => peer.ip === `[${node_interface.address}]:${node_interface.port}`
    )
    if (!crawler_peer) continue

    const other_live_node_ids = (
      history_node_ids_by_account.get(crawler_peer.account) || []
    ).filter((id) => id !== node_id && live_node_ids.has(id))
    if (other_live_node_ids.length) continue

    return { rep: crawler_peer, source: 'rep_crawler' }
  }

  const history_account = history_account_by_node_id.get(node_id)
  if (history_account && rep_peers[history_account]) {
    return { rep: rep_peers[history_account], source: 'telemetry_history' }
  }

  return { rep: null, source: 'unknown' }
}
