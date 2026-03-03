import config from '#config'

const report_job = async ({ job_id, success, reason, duration_ms }) => {
  const { api_url, api_key } = config.job_tracker || {}
  if (!api_url || !api_key) {
    return
  }

  const controller = new AbortController()
  const timeout_id = setTimeout(() => controller.abort(), 5000)
  try {
    const res = await fetch(`${api_url}/api/jobs/report`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${api_key}`
      },
      body: JSON.stringify({
        job_id,
        success,
        reason,
        duration_ms,
        schedule: process.env.JOB_SCHEDULE || null,
        schedule_type: process.env.JOB_SCHEDULE_TYPE || null,
        project: process.env.JOB_PROJECT || 'nano-community',
        server: process.env.JOB_PROJECT || 'nano-community'
      })
    })
    await res.body?.cancel()
  } catch (error) {
    console.error(`job tracker report failed: ${error.message}`)
  } finally {
    clearTimeout(timeout_id)
  }
}

export default report_job
