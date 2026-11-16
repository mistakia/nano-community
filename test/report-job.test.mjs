/* global describe before after beforeEach it */
import chai from 'chai'
import fs from 'fs/promises'
import os from 'os'
import path from 'path'

const expect = chai.expect

// A stub base binary records its argv, one entry per line, and a copy of the
// payload file, which report_job deletes once the call returns.
const STUB_SOURCE = `#!/bin/sh
: > "$REPORT_JOB_TEST_OUTPUT"
for argument in "$@"; do printf '%s\\n' "$argument" >> "$REPORT_JOB_TEST_OUTPUT"; done
while [ $# -gt 0 ]; do
  if [ "$1" = --payload-file ]; then cat "$2" > "$REPORT_JOB_TEST_OUTPUT.payload"; fi
  shift
done
`

describe('report_job', () => {
  let report_job
  let directory
  let output_file
  const saved_environment = {}

  before(async () => {
    directory = await fs.mkdtemp(path.join(os.tmpdir(), 'report-job-test-'))
    const stub_file = path.join(directory, 'base')
    await fs.writeFile(stub_file, STUB_SOURCE, { mode: 0o755 })
    output_file = path.join(directory, 'arguments')
    for (const key of [
      'BASE_CLI_PATH',
      'BASE_API_URL',
      'JOB_SCHEDULE_ENTITY_URI',
      'REPORT_JOB_TEST_OUTPUT'
    ]) {
      saved_environment[key] = process.env[key]
    }
    process.env.BASE_CLI_PATH = stub_file
    process.env.BASE_API_URL = 'http://base.test'
    process.env.REPORT_JOB_TEST_OUTPUT = output_file
    delete process.env.JOB_SCHEDULE_ENTITY_URI
    report_job = (await import('#libs-server/report-job.mjs')).default
  })

  after(async () => {
    for (const [key, value] of Object.entries(saved_environment)) {
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    }
    await fs.rm(directory, { recursive: true, force: true })
  })

  beforeEach(async () => {
    await fs.rm(output_file, { force: true })
    await fs.rm(`${output_file}.payload`, { force: true })
  })

  const read_arguments = async () =>
    (await fs.readFile(output_file, 'utf8')).trim().split('\n')

  it('reports success with exit code 0', async () => {
    await report_job({ job_id: 'test-job', success: true })
    expect(await read_arguments()).to.deep.equal([
      'run',
      'report',
      '--source',
      'service:nano-community-test-job',
      '--outcome',
      'success',
      '--exit-code',
      '0'
    ])
  })

  it('reports failure with exit code 1 and the reason', async () => {
    await report_job({ job_id: 'test-job', success: false, reason: 'boom' })
    expect(await read_arguments()).to.deep.equal([
      'run',
      'report',
      '--source',
      'service:nano-community-test-job',
      '--outcome',
      'failure',
      '--exit-code',
      '1',
      '--reason',
      'boom'
    ])
  })

  it('reports alive with its schedule and payload and no exit code', async () => {
    const payload = { spool_entry_count: 3, spool_oldest_entry_age_seconds: 42 }
    await report_job({
      job_id: 'network-observer',
      outcome: 'alive',
      schedule: '5m',
      payload
    })
    const run_arguments = await read_arguments()
    expect(run_arguments.slice(0, 10)).to.deep.equal([
      'run',
      'report',
      '--source',
      'service:nano-community-network-observer',
      '--outcome',
      'alive',
      '--schedule',
      '5m',
      '--schedule-type',
      'every'
    ])
    expect(run_arguments[10]).to.equal('--payload-file')
    expect(run_arguments).to.have.length(12)
    expect(
      JSON.parse(await fs.readFile(`${output_file}.payload`, 'utf8'))
    ).to.deep.equal(payload)
    // the temporary payload file is removed after the call
    await fs.access(run_arguments[11]).then(
      () => expect.fail('payload file was left behind'),
      () => {}
    )
  })

  it('does nothing without BASE_API_URL', async () => {
    delete process.env.BASE_API_URL
    try {
      await report_job({ job_id: 'test-job', success: true })
    } finally {
      process.env.BASE_API_URL = 'http://base.test'
    }
    await fs.access(output_file).then(
      () => expect.fail('base was called'),
      () => {}
    )
  })

  it('refuses an unknown outcome', async () => {
    let error
    try {
      await report_job({ job_id: 'test-job', outcome: 'paused' })
    } catch (caught) {
      error = caught
    }
    expect(error?.message).to.equal('unknown run outcome paused')
  })
})
