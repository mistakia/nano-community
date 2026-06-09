import os from 'os'
import { execFile } from 'child_process'
import { promisify } from 'util'

const exec_file = promisify(execFile)

const report_job = async ({ job_id, success, reason }) => {
  const api_url = process.env.BASE_API_URL
  if (!api_url) return

  const source =
    process.env.JOB_SCHEDULE_ENTITY_URI || `service:nano-community-${job_id}`
  const outcome = success ? 'success' : 'failure'

  const controller = new AbortController()
  const timeout_id = setTimeout(() => controller.abort(), 5000)
  try {
    const { stdout } = await exec_file('base', ['instance', 'sign-token'], {
      timeout: 5000
    })
    const token = stdout.trim()
    if (!token) {
      console.error('run report failed: empty machine token')
      return
    }

    const res = await fetch(`${api_url.replace(/\/$/, '')}/api/runs/report`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Machine ${token}`
      },
      body: JSON.stringify({
        source,
        host: os.hostname().split('.')[0],
        outcome,
        exit_code: success ? 0 : 1,
        reason: reason || null
      })
    })
    await res.body?.cancel()
    if (!res.ok) {
      console.error(`run report failed: HTTP ${res.status}`)
    }
  } catch (error) {
    console.error(`run report failed: ${error.message}`)
  } finally {
    clearTimeout(timeout_id)
  }
}

export default report_job
