/* global describe before after beforeEach afterEach it */
import chai from 'chai'
import fs from 'fs'
import os from 'os'
import path from 'path'
import net from 'net'
import Knex from 'knex'

import knex from '#db'
import config from '#config'
import insert_network_events from '#libs-server/network-events/insert-network-events.mjs'
import create_network_event_spool from '#libs-server/network-observer/network-event-spool.mjs'
import { mochaGlobalSetup } from './global.mjs'

const expect = chai.expect

const REPRESENTATIVE_ACCOUNT = `nano_3${'1'.repeat(59)}`

const build_event = (began_at) => ({
  network_event_type: 'representative_cemented_behind',
  network_event_phase: 'began',
  representative_account: REPRESENTATIVE_ACCOUNT,
  evidence: { began_at },
  observed_at: began_at
})

const build_coverage_window = (began_at) => ({
  producer: 'network_observer',
  coverage_began_at: began_at,
  coverage_ended_at: began_at + 59
})

const clear_tables = async () => {
  await knex('network_events').del()
  await knex('network_event_coverage').del()
}

// A TCP proxy in front of the test database. stop() drops every connection
// and refuses new ones, which the client sees as Postgres going away.
const start_database_proxy = async () => {
  const { host, port } = config.production_postgres.connection
  const sockets = new Set()
  let server = null
  const listen = (listen_port) =>
    new Promise((resolve) => {
      server = net.createServer((client) => {
        const upstream = net.connect(port, host)
        for (const socket of [client, upstream]) {
          sockets.add(socket)
          socket.on('close', () => sockets.delete(socket))
          socket.on('error', () => {})
        }
        client.pipe(upstream).pipe(client)
      })
      server.listen(listen_port, '127.0.0.1', () =>
        resolve(server.address().port)
      )
    })
  const proxy_port = await listen(0)
  return {
    proxy_port,
    stop: () =>
      new Promise((resolve) => {
        for (const socket of sockets) socket.destroy()
        server.close(() => resolve())
      }),
    restart: () => listen(proxy_port)
  }
}

describe('network observer spool', () => {
  let spool_directory

  before(async () => {
    await mochaGlobalSetup()
    await clear_tables()
  })

  beforeEach(() => {
    spool_directory = fs.mkdtempSync(
      path.join(os.tmpdir(), 'network-observer-spool-')
    )
  })

  afterEach(async () => {
    fs.rmSync(spool_directory, { recursive: true, force: true })
    await clear_tables()
  })

  it('keeps appends that continue during a drain', async () => {
    let release_insert
    const insert_started = new Promise((resolve) => {
      release_insert = resolve
    })
    let resume_insert
    const insert_gate = new Promise((resolve) => {
      resume_insert = resolve
    })
    const spool = create_network_event_spool({
      spool_directory,
      insert: async (records) => {
        release_insert()
        await insert_gate
        return insert_network_events(records)
      }
    })

    spool.append_network_event(build_event(1000))
    spool.rotate()
    const drain = spool.drain()
    await insert_started
    // Appended while the first segment's insert is in flight.
    spool.append_network_event(build_event(2000))
    spool.append_network_event(build_event(3000))
    resume_insert()
    const first = await drain

    expect(first.drained_segment_count).to.equal(1)
    expect(spool.get_status().spool_entry_count).to.equal(2)

    spool.rotate()
    await spool.drain()
    const rows = await knex('network_events').orderBy('observed_at')
    expect(rows.map((row) => row.observed_at.getTime() / 1000)).to.deep.equal([
      1000, 2000, 3000
    ])
    expect(spool.get_status().spool_entry_count).to.equal(0)
  })

  it('delivers every event exactly once across a Postgres outage mid-drain', async () => {
    const proxy = await start_database_proxy()
    const proxy_db = Knex({
      ...config.production_postgres,
      connection: {
        ...config.production_postgres.connection,
        host: '127.0.0.1',
        port: proxy.proxy_port
      },
      pool: { min: 0, max: 2 }
    })

    try {
      let insert_count = 0
      const spool = create_network_event_spool({
        spool_directory,
        insert: async (records) => {
          insert_count += 1
          // Postgres goes away after the first segment commits.
          if (insert_count === 2) await proxy.stop()
          return insert_network_events({ ...records, db: proxy_db })
        }
      })

      for (const minute of [0, 1, 2]) {
        const began_at = 10000 + minute * 60
        spool.append_network_event(build_event(began_at))
        spool.append_network_event(build_event(began_at + 1))
        spool.append_coverage_window(build_coverage_window(began_at))
        spool.rotate()
      }

      let drain_error = null
      try {
        await spool.drain()
      } catch (error) {
        drain_error = error
      }
      expect(drain_error).to.not.equal(null)
      expect(await knex('network_events')).to.have.length(2)
      expect(spool.get_status().spool_segment_count).to.equal(2)

      await proxy.restart()
      const second = await spool.drain()
      expect(second.drained_segment_count).to.equal(2)

      const rows = await knex('network_events')
      expect(rows).to.have.length(6)
      expect(new Set(rows.map((row) => row.network_event_id)).size).to.equal(6)
      expect(await knex('network_event_coverage')).to.have.length(3)
      expect(spool.get_status().spool_segment_count).to.equal(0)
    } finally {
      await proxy_db.destroy()
      await proxy.stop()
    }
  })

  it('replays a segment whose delete never happened without duplicate events', async () => {
    let should_crash = true
    const spool = create_network_event_spool({
      spool_directory,
      insert: async (records) => {
        const result = await insert_network_events(records)
        // The insert committed, then the process died before the delete.
        if (should_crash) throw new Error('crashed after commit')
        return result
      }
    })
    spool.append_network_event(build_event(5000))
    spool.rotate()

    await spool.drain().catch(() => {})
    should_crash = false
    const replay = await spool.drain()

    expect(replay.inserted_count).to.equal(0)
    expect(await knex('network_events')).to.have.length(1)
  })

  it('closes a segment left open by a crash and skips its partial last line', async () => {
    const crashed = create_network_event_spool({ spool_directory })
    crashed.append_network_event(build_event(7000))
    const [open_file] = fs.readdirSync(spool_directory)
    fs.appendFileSync(path.join(spool_directory, open_file), '{"network_ev')

    const restarted = create_network_event_spool({ spool_directory })
    expect(fs.readdirSync(spool_directory)[0]).to.match(/\.ndjson$/)
    await restarted.drain()
    expect(await knex('network_events')).to.have.length(1)
  })

  it('reports depth and oldest age matching the files on disk', () => {
    let now_ms = 1_000_000
    const spool = create_network_event_spool({
      spool_directory,
      now: () => now_ms
    })
    expect(spool.get_status()).to.deep.equal({
      spool_segment_count: 0,
      spool_entry_count: 0,
      spool_oldest_entry_age_seconds: 0
    })

    spool.append_network_event(build_event(1))
    spool.append_network_event(build_event(2))
    now_ms += 60_000
    spool.rotate()
    spool.append_network_event(build_event(3))
    now_ms += 30_000

    const line_count = fs
      .readdirSync(spool_directory)
      .map(
        (file) =>
          fs
            .readFileSync(path.join(spool_directory, file), 'utf8')
            .split('\n')
            .filter(Boolean).length
      )
      .reduce((sum, count) => sum + count, 0)
    expect(spool.get_status()).to.deep.equal({
      spool_segment_count: fs.readdirSync(spool_directory).length,
      spool_entry_count: line_count,
      spool_oldest_entry_age_seconds: 90
    })
    expect(line_count).to.equal(3)
  })

  after(clear_tables)
})
