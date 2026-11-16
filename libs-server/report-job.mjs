import { execFile } from 'child_process'
import fs from 'fs/promises'
import os from 'os'
import path from 'path'
import { promisify } from 'util'

const exec_file = promisify(execFile)

// Resolve base by absolute path, not bare `base` on PATH: the pm2 process env
// does not include ~/.base/bin, so a bare `base` spawn ENOENTs and every run
// report is silently lost. See user:text/base/machine-token-auth.md.
const get_base_cli = () => process.env.BASE_CLI_PATH || '/root/.base/bin/base'

const REPORT_OUTCOMES = ['success', 'failure', 'alive']

// outcome defaults from success. An `alive` tick is a long-lived service's
// heartbeat: it carries no exit code, and `schedule` (an `every` interval such
// as '5m') tells the stale sweep when the next tick is due. payload is any
// JSON value, passed to `base run report` through a temporary file.
const report_job = async ({
  job_id,
  success,
  outcome = success ? 'success' : 'failure',
  reason,
  payload,
  schedule
}) => {
  const api_url = process.env.BASE_API_URL
  if (!api_url) return
  if (!REPORT_OUTCOMES.includes(outcome)) {
    throw new Error(`unknown run outcome ${outcome}`)
  }

  const source =
    process.env.JOB_SCHEDULE_ENTITY_URI || `service:nano-community-${job_id}`

  // Single canonical client: `base run report` owns transport selection (local
  // UDS on the writer, an Authorization: Machine token off-host), host identity
  // (BASE_MACHINE_SLUG), and the payload cap -- no hand-rolled sign-token+curl.
  // See user:text/base/machine-token-auth.md.
  const args = ['run', 'report', '--source', source, '--outcome', outcome]
  if (outcome !== 'alive') {
    args.push('--exit-code', outcome === 'success' ? '0' : '1')
  }
  if (schedule) {
    args.push('--schedule', schedule, '--schedule-type', 'every')
  }
  // Cap the reason before it becomes an argv entry. A Knex query error embeds
  // the full SQL; a bulk insert that overflows the PG parameter limit produces
  // a multi-megabyte message, and passing that as `--reason` overflows execve's
  // MAX_ARG_STRLEN, so the whole spawn fails with E2BIG and the run report is
  // silently lost. Truncate to a size base run report will accept regardless.
  if (reason) {
    const MAX_REASON_LENGTH = 2000
    const trimmed =
      reason.length > MAX_REASON_LENGTH
        ? `${reason.slice(0, MAX_REASON_LENGTH)} [truncated]`
        : reason
    args.push('--reason', trimmed)
  }

  let payload_directory = null
  try {
    if (payload !== undefined) {
      payload_directory = await fs.mkdtemp(
        path.join(os.tmpdir(), 'report-job-')
      )
      const payload_file = path.join(payload_directory, 'payload.json')
      await fs.writeFile(payload_file, JSON.stringify(payload))
      args.push('--payload-file', payload_file)
    }
    await exec_file(get_base_cli(), args, { timeout: 5000 })
  } catch (error) {
    console.error(`run report failed: ${error.message}`)
  } finally {
    if (payload_directory) {
      await fs.rm(payload_directory, { recursive: true, force: true })
    }
  }
}

export default report_job
