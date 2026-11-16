import fs from 'fs'
import path from 'path'
import debug from 'debug'

import insert_network_events from '#libs-server/network-events/insert-network-events.mjs'

const log = debug('network-observer:spool')

const OPEN_SUFFIX = '.open'
const CLOSED_SUFFIX = '.ndjson'

// The observer's local-first spool. Records are appended to one open NDJSON
// segment, which the observer closes every minute with rotate(). drain()
// reads closed segments only, oldest first, and deletes a segment only after
// its inserts commit, so an append and a drain never touch the same file and
// a Postgres outage only grows the backlog.
//
// A record is { network_event } or { coverage_window }. Replays are safe:
// events dedupe on network_event_id. A crash between a commit and the delete
// replays that segment's coverage windows as duplicate rows, which is harmless
// because coverage is read as a union of ranges.
export const create_network_event_spool = ({
  spool_directory,
  insert = insert_network_events,
  now = Date.now
}) => {
  fs.mkdirSync(spool_directory, { recursive: true })

  const segment_path = (file) => path.join(spool_directory, file)

  // A segment left open by a crash is closed as it stands.
  for (const file of fs.readdirSync(spool_directory)) {
    if (file.endsWith(OPEN_SUFFIX)) {
      fs.renameSync(
        segment_path(file),
        segment_path(file.slice(0, -OPEN_SUFFIX.length) + CLOSED_SUFFIX)
      )
    }
  }

  let open_segment_name = null
  let segment_sequence = 0
  let is_draining = false

  // Zero-padded, so names sort in creation order.
  const next_segment_name = () =>
    `${String(now()).padStart(15, '0')}-${String(segment_sequence++).padStart(6, '0')}`

  const append = (record) => {
    if (!open_segment_name) open_segment_name = next_segment_name()
    fs.appendFileSync(
      segment_path(open_segment_name + OPEN_SUFFIX),
      JSON.stringify({ spooled_at_ms: now(), ...record }) + '\n'
    )
  }

  const append_network_event = (network_event) => append({ network_event })

  const append_coverage_window = (coverage_window) =>
    append({ coverage_window })

  const rotate = () => {
    if (!open_segment_name) return
    fs.renameSync(
      segment_path(open_segment_name + OPEN_SUFFIX),
      segment_path(open_segment_name + CLOSED_SUFFIX)
    )
    open_segment_name = null
  }

  const list_segments = ({ include_open = false } = {}) =>
    fs
      .readdirSync(spool_directory)
      .filter(
        (file) =>
          file.endsWith(CLOSED_SUFFIX) ||
          (include_open && file.endsWith(OPEN_SUFFIX))
      )
      .sort()

  // A crash can leave a partial last line, which is skipped. Any other
  // unreadable line throws, so the segment stays and the backlog shows it.
  const read_segment = (file) => {
    const lines = fs
      .readFileSync(segment_path(file), 'utf8')
      .split('\n')
      .filter(Boolean)
    const records = []
    lines.forEach((line, index) => {
      try {
        records.push(JSON.parse(line))
      } catch (error) {
        if (index !== lines.length - 1) throw error
        log(`skipping a partial last line in ${file}`)
      }
    })
    return records
  }

  const drain = async () => {
    if (is_draining) return { drained_segment_count: 0, inserted_count: 0 }
    is_draining = true
    let drained_segment_count = 0
    let inserted_count = 0
    try {
      for (const file of list_segments()) {
        const records = read_segment(file)
        const network_events = records
          .filter((record) => record.network_event)
          .map((record) => record.network_event)
        const coverage_windows = records
          .filter((record) => record.coverage_window)
          .map((record) => record.coverage_window)
        if (network_events.length || coverage_windows.length) {
          const result = await insert({ network_events, coverage_windows })
          inserted_count += result.inserted_count
        }
        fs.unlinkSync(segment_path(file))
        drained_segment_count += 1
      }
    } finally {
      is_draining = false
    }
    return { drained_segment_count, inserted_count }
  }

  // Read from the files on disk, open segment included, so the reading is
  // what a restart would find.
  const get_status = () => {
    const files = list_segments({ include_open: true })
    let spool_entry_count = 0
    let oldest_spooled_at_ms = null
    for (const file of files) {
      const records = read_segment(file)
      spool_entry_count += records.length
      for (const record of records) {
        if (
          oldest_spooled_at_ms === null ||
          record.spooled_at_ms < oldest_spooled_at_ms
        ) {
          oldest_spooled_at_ms = record.spooled_at_ms
        }
      }
    }
    return {
      spool_segment_count: files.length,
      spool_entry_count,
      spool_oldest_entry_age_seconds:
        oldest_spooled_at_ms === null
          ? 0
          : Math.max(0, Math.floor((now() - oldest_spooled_at_ms) / 1000))
    }
  }

  return {
    append_network_event,
    append_coverage_window,
    rotate,
    drain,
    get_status
  }
}

export default create_network_event_spool
