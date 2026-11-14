// One-off deploy backfill for the delivery foundation: prints one UPDATE for
// began rows still without a condition id (written by old code between the
// schema apply and the code fast-forward), then an UPDATE per stored ended
// row giving it its began row's network_event_id as condition id.
// network_events refuses updates, so the output is applied as postgres with
// SET session_replication_role = replica prepended. Delete this script once
// the deploy verify passes.
import default_db from '#db'
import { isMain } from '#common'
import build_network_event_id from '#libs-server/network-events/build-network-event-id.mjs'

const quote_literal = (value) => `'${String(value).replace(/'/g, "''")}'`

export const build_condition_id_updates = async ({ db = default_db } = {}) => {
  const ended_rows = await db('network_events')
    .where({ network_event_phase: 'ended' })
    .whereNull('network_event_condition_id')
    .orderBy('network_event_sequence', 'asc')

  const began_update =
    "UPDATE public.network_events SET network_event_condition_id = network_event_id WHERE network_event_phase = 'began' AND network_event_condition_id IS NULL;"

  const ended_updates = ended_rows.map((row) => {
    const network_event_condition_id = build_network_event_id({
      ...row,
      network_event_phase: 'began'
    })
    return `UPDATE public.network_events SET network_event_condition_id = ${quote_literal(network_event_condition_id)} WHERE network_event_id = ${quote_literal(row.network_event_id)};`
  })

  return [began_update, ...ended_updates]
}

if (isMain(import.meta.url)) {
  const main = async () => {
    let exit_code = 0
    try {
      const updates = await build_condition_id_updates()
      process.stdout.write(updates.map((update) => `${update}\n`).join(''))
    } catch (err) {
      console.error(err)
      exit_code = 1
    }
    await default_db.destroy()
    process.exit(exit_code)
  }

  main()
}
