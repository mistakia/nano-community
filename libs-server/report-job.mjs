import { execFile } from 'child_process'
import { promisify } from 'util'

const exec_file = promisify(execFile)

// Resolve base by absolute path, not bare `base` on PATH: the pm2 process env
// does not include ~/.base/bin, so a bare `base` spawn ENOENTs and every run
// report is silently lost. See user:text/base/machine-token-auth.md.
const BASE_CLI = process.env.BASE_CLI_PATH || '/root/.base/bin/base'

const report_job = async ({ job_id, success, reason }) => {
  const api_url = process.env.BASE_API_URL
  if (!api_url) return

  const source =
    process.env.JOB_SCHEDULE_ENTITY_URI || `service:nano-community-${job_id}`
  const outcome = success ? 'success' : 'failure'

  // Single canonical client: `base run report` owns transport selection (local
  // UDS on the writer, an Authorization: Machine token off-host), host identity
  // (BASE_MACHINE_SLUG), and the payload cap -- no hand-rolled sign-token+curl.
  // See user:text/base/machine-token-auth.md.
  const args = [
    'run',
    'report',
    '--source',
    source,
    '--outcome',
    outcome,
    '--exit-code',
    success ? '0' : '1'
  ]
  if (reason) args.push('--reason', reason)

  try {
    await exec_file(BASE_CLI, args, { timeout: 5000 })
  } catch (error) {
    console.error(`run report failed: ${error.message}`)
  }
}

export default report_job
