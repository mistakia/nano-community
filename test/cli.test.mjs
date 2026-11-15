// base-secret-scan: declared-fixture
// The nano private key below is a synthetic repeated-byte test key; it is not a
// real credential.

/* global describe, before, after, it */
import chai from 'chai'
import { spawn } from 'child_process'
import http from 'http'

import server from '#api/server.mjs'
import config from '#config'
import db from '#db'
import { stub_block_info } from './utils/stub-block-info.mjs'

const { port } = config

process.env.NODE_ENV = 'test'
const expect = chai.expect

const nano_private_key =
  '1111111111111111111111111111111111111111111111111111111111111111'

// The hidden key prompt is the CLI's only stderr output on success, so
// stdout stays the command's output alone
const key_prompt = '? Private key (64 hex characters, hidden): '

const PUBLISHED_BIN = 'cli/index.mjs'
const TEST_API_BIN = 'test/utils/run-cli-against-test-api.mjs'

// Runs the CLI with the private key and then these lines on stdin. The
// prompts buffer piped lines, so every answer can be written before the first
// prompt is asked.
const run_cli = (
  args,
  { key = nano_private_key, input = '', env = {}, bin = TEST_API_BIN } = {}
) =>
  new Promise((resolve) => {
    const child = spawn('node', [bin, ...args], {
      env: { ...process.env, ...env }
    })
    let stdout = ''
    let stderr = ''
    child.stdout.on('data', (data) => (stdout += data))
    child.stderr.on('data', (data) => (stderr += data))
    child.on('close', (code) => resolve({ code, stdout, stderr }))
    child.stdin.end(key === null ? input : `${key}\n${input}`)
  })

const lines = (...answers) => answers.map((answer) => `${answer}\n`).join('')

describe('CLI', function () {
  this.timeout(30000)

  let new_signing_key
  const nano_account_address =
    'nano_3d78japo7ziqqcsptk47eonzwzwjyaydcywq5ebzowjpxgyehynnjc9pd5zj'

  before(
    () =>
      new Promise((resolve) => {
        // The CLI children call the test server on its configured port
        process.env.NANO_TEST_CLI_API_URL = `http://localhost:${port}`

        server.listen(port, () => {
          console.log(`API listening on port ${port}`)
          resolve()
        })
      })
  )

  after(() => {
    server.close()
  })

  describe('add-signing-key command', () => {
    it('should add a new signing key', async () => {
      const { code, stdout, stderr } = await run_cli(['add-signing-key'], {
        input: lines('y')
      })

      expect(code).to.equal(0)
      expect(stdout).to.include('Key registration successful')
      expect(stdout + stderr).to.not.include(nano_private_key)

      // The public key is on stdout, and the new private key only on stderr
      const public_match = stdout.match(/^Signing public key: ([a-f0-9]{64})$/m)
      expect(public_match, stdout).to.not.equal(null)
      new_signing_key = public_match[1]
      const private_match = stderr.match(/saved nowhere:\n([a-f0-9]{64})\n$/)
      expect(private_match, stderr).to.not.equal(null)
      expect(stdout).to.not.include(private_match[1])

      const row = await db('account_keys')
        .where({ public_key: new_signing_key })
        .first()
      expect(row.account).to.equal(nano_account_address)
      expect(JSON.parse(row.link_message).action).to.equal('link_key')
      expect(JSON.parse(row.accept_link_message).action).to.equal('accept_link')
    })
  })

  describe('revoke-signing-key command', () => {
    it('should revoke an existing signing key', async () => {
      if (!new_signing_key) {
        throw new Error('No new signing key found for revocation test')
      }
      const { code, stdout, stderr } = await run_cli(
        ['revoke-signing-key', new_signing_key.toUpperCase()],
        { input: lines('y') }
      )
      expect(code).to.equal(0)
      expect(stderr).to.equal(key_prompt)
      // the confirmation names the key being revoked, not the signer
      expect(stdout).to.include(new_signing_key)
      expect(stdout).to.include('Key revocation successful')
      expect(stdout).to.not.include(nano_private_key)

      const row = await db('account_keys')
        .where({ public_key: new_signing_key })
        .first()
      expect(row.revoked_at).to.be.a('number')
      expect(JSON.parse(row.revoke_message).parameters).to.deep.equal({
        linked_public_key: new_signing_key
      })
    })
  })

  describe('update-rep-meta operation', () => {
    it('should send a message for update-rep-meta operation and check database updates', async () => {
      const expected = {
        alias: 'TestNodeAlias',
        description: 'A test node for development purposes.',
        donation_address:
          'nano_3niceeeyiaaif5xoiqjvth5gqrypuwytrm867asbciw3ndz8j3mazqqk6cok',
        cpu_model: 'Intel i7',
        cpu_cores: 4,
        ram: 16,
        reddit: 'test_reddit_user',
        twitter: 'test_twitter_user',
        discord: 'test_discord_user#1234',
        discord_user_id: '123456789012345678',
        github: 'test_github_user',
        email: 'test@example.com',
        website: 'https://example.com'
      }
      // The answers in prompt order, then no edit and a yes to send
      const { code, stdout, stderr } = await run_cli(['update-rep-meta'], {
        input: lines(...Object.values(expected), 'N', 'y')
      })
      expect(stderr, stdout).to.equal(key_prompt)
      expect(code).to.equal(0)

      const updated_account = await db('accounts')
        .where({ account: nano_account_address })
        .first()
      expect(updated_account.alias).to.equal(expected.alias)

      const updated_representative = await db('representatives_meta_index')
        .where({ account: nano_account_address })
        .first()
      const { alias, ...representative_fields } = expected
      for (const [field, value] of Object.entries(representative_fields)) {
        expect(updated_representative[field], field).to.equal(value)
      }
    })
  })

  describe('update-account-meta operation', () => {
    it('should send a message for update-account-meta operation', async () => {
      const { code, stdout, stderr } = await run_cli(['update-account-meta'], {
        input: lines('Alias', 'n', 'y')
      })
      expect(stderr, stdout).to.equal(key_prompt)
      expect(code).to.equal(0)
      expect(stdout).to.include('Message sent:')

      const row = await db('nano_community_messages')
        .where({ operation: 'SET_ACCOUNT_META', version: 2 })
        .whereRaw('message like ?', [`%${nano_account_address}%`])
        .first()
      expect(JSON.parse(row.content)).to.deep.equal({ alias: 'Alias' })
    })
  })

  describe('update-block-meta operation', () => {
    const block_hash =
      '943E3EED4F340ECBF7E06FA2E74A3E17B1DC4148C6913403B8ACFE7FBB1C2139'
    let blocks
    before(() => {
      blocks = stub_block_info()
      blocks.set(block_hash.toLowerCase(), {
        block_account: nano_account_address
      })
    })
    after(() => blocks.restore())

    it('should send a message for update-block-meta operation', async () => {
      const { code, stdout, stderr } = await run_cli(
        ['update-block-meta', block_hash],
        { input: lines('Test note for update-block-meta operation', 'n', 'y') }
      )
      expect(stderr, stdout).to.equal(key_prompt)
      expect(code).to.equal(0)

      const row = await db('nano_community_messages')
        .where({ operation: 'SET_BLOCK_META', version: 2 })
        .where({ references: block_hash.toLowerCase() })
        .first()
      expect(row.references).to.equal(block_hash.toLowerCase())
    })
  })

  describe('update-representative-power-reading operation', () => {
    before(() =>
      db('accounts')
        .insert({ account: nano_account_address, representative: true })
        .onConflict('account')
        .merge(['representative'])
    )
    const ended_at = Math.floor(Date.now() / 1000) - 3600
    const started_at = ended_at - 2 * 24 * 60 * 60
    const iso = (seconds) => new Date(seconds * 1000).toISOString()
    const run_reading = (...answers) =>
      run_cli(['update-representative-power-reading'], {
        input: lines(...answers)
      })

    it('signs a number and integer epoch seconds after an edited field', async () => {
      // A first end the edit replaces: yes to edit, the field, its new
      // value, then no further edit and a yes to send
      const { code, stdout, stderr } = await run_reading(
        '2000',
        '  wall_meter  ',
        iso(started_at).replace('.000Z', '.900Z'),
        iso(ended_at - 60),
        'y',
        'measurement_ended_at',
        iso(ended_at),
        'n',
        'y'
      )
      expect(stderr, stdout).to.equal(key_prompt)
      expect(code).to.equal(0)
      expect(stdout).to.include('Enter new value for measurement_ended_at')

      const row = await db('nano_community_messages')
        .where({ operation: 'SET_REPRESENTATIVE_POWER_READING', version: 2 })
        .whereRaw('message like ?', [`%${nano_account_address}%`])
        .first()
      expect(JSON.parse(row.message).parameters.content).to.deep.equal({
        energy_watt_hours: 2000,
        measurement_method: 'wall_meter',
        measurement_started_at: started_at,
        measurement_ended_at: ended_at
      })
    })

    it('refuses a time with no zone and a blank or non-decimal energy', async () => {
      const no_zone = iso(started_at).replace('Z', '')
      for (const [energy, start, error] of [
        ['2000', no_zone, 'not an ISO 8601 datetime with a Z or offset'],
        ['2000', '11/13/2026', 'not an ISO 8601 datetime with a Z or offset'],
        ['2000', 'yesterday', 'not an ISO 8601 datetime with a Z or offset'],
        [
          '2000',
          '2026-02-30T00:00:00Z',
          'not an ISO 8601 datetime with a Z or offset'
        ],
        ['2.5', iso(started_at), 'not a whole number of watt-hours'],
        ['', iso(started_at), 'not a whole number of watt-hours'],
        ['0x10', iso(started_at), 'not a whole number of watt-hours'],
        ['1e3', iso(started_at), 'not a whole number of watt-hours']
      ]) {
        const { code, stdout, stderr } = await run_reading(
          energy,
          'wall_meter',
          start,
          iso(ended_at),
          'n'
        )
        expect(code, `${energy} ${start}`).to.equal(1)
        expect(stderr).to.include(error)
        expect(stdout).to.not.include('Sign and send?')
      }
    })
  })

  describe('report-representative-hardware operation', () => {
    it('collects the host details and sends nothing when cancelled', async () => {
      const { code, stdout } = await run_cli(
        ['report-representative-hardware'],
        { input: lines('n') }
      )
      expect(code).to.equal(0)
      // The reviewed payload is the one JSON block printed
      const payload = JSON.parse(
        stdout.slice(stdout.indexOf('{'), stdout.lastIndexOf('}') + 1)
      )
      expect(payload.action).to.equal('set_representative_hardware')
      expect(payload.account).to.equal(nano_account_address)
      const report = payload.parameters.content
      expect(report.logical_cpus).to.be.a('number').above(0)
      expect(report.memory_bytes).to.be.a('number').above(0)
      expect(report.storage).to.be.an('array')
      expect(report.cpu_utilization_basis_points).to.be.within(0, 10000)
      expect(stdout).to.include('Cancelled. Nothing was signed or sent.')

      const rows = await db('nano_community_messages')
        .where({ operation: 'SET_REPRESENTATIVE_HARDWARE' })
        .whereRaw('message like ?', [`%${nano_account_address}%`])
      expect(rows).to.have.length(0)
    })
  })
  describe('safety', () => {
    const run = (command, env = {}) =>
      run_cli(command.args, { bin: PUBLISHED_BIN, ...command, env })
    const linked_public_key = 'ab'.repeat(32)

    // A local server that answers every request with this status and body
    const with_server = async (handler, test) => {
      const stub = http.createServer(handler)
      await new Promise((resolve) => stub.listen(0, '127.0.0.1', resolve))
      try {
        return await test(`http://127.0.0.1:${stub.address().port}`)
      } finally {
        stub.close()
      }
    }

    it('sends only to nano.community from the published bin', async () => {
      const { code, stdout, stderr } = await run(
        { args: ['revoke-signing-key', linked_public_key], input: lines('n') },
        { NC_CLI_API_URL: 'http://127.0.0.1:1' }
      )
      expect(code).to.equal(0)
      expect(stdout).to.include(
        'This will be signed and sent to https://nano.community/api/auth/revoke/key:'
      )
      expect(stdout).to.include('Cancelled. Nothing was signed or sent.')
      expect(stderr).to.equal(key_prompt)
    })

    it('fails, sending nothing, when input ends before the confirmation', async () => {
      const { code, stdout, stderr } = await run_cli([
        'revoke-signing-key',
        linked_public_key
      ])
      expect(code).to.equal(1)
      expect(stderr).to.include('Input ended before the confirmation')
      expect(stdout).to.not.include('Key revocation successful')
    })

    it('shows invisible and format characters escaped in the review', async () => {
      const alias = 'a\u200bb\u202ec\u2028d\u{e0041}e\u3164f\u00a0g'
      const { code, stdout } = await run_cli(['update-account-meta'], {
        input: lines(alias, 'n', 'n')
      })
      expect(code).to.equal(0)
      for (const escaped of [
        '\\u200b',
        '\\u202e',
        '\\u2028',
        '\\u{e0041}',
        '\\u3164',
        '\\u00a0'
      ]) {
        expect(stdout).to.include(escaped)
      }
      expect(stdout).to.not.match(/[\u200b\u202e\u2028\u3164\u00a0]|\u{e0041}/u)
    })

    it('prints a server response with its control characters escaped', async () => {
      const hostile = '\u001b]52;c;aGk=\u0007\u202e'
      await with_server(
        (req, res) => res.end(JSON.stringify(hostile)),
        async (url) => {
          const { code, stdout } = await run_cli(
            ['revoke-signing-key', linked_public_key],
            { input: lines('y'), env: { NANO_TEST_CLI_API_URL: url } }
          )
          expect(code).to.equal(0)
          expect(stdout).to.include('Key revocation successful:')
          expect(stdout).to.include('\\u001b]52;c;aGk=\\u0007\\u202e')
          // eslint-disable-next-line no-control-regex
          expect(stdout).to.not.match(/[\u001b\u0007\u202e]/)
        }
      )
    })

    it('refuses a response larger than 1 MiB', async () => {
      await with_server(
        (req, res) => res.end(`"${'a'.repeat(2 * 1024 * 1024)}"`),
        async (url) => {
          const { code, stderr } = await run_cli(
            ['revoke-signing-key', linked_public_key],
            { input: lines('y'), env: { NANO_TEST_CLI_API_URL: url } }
          )
          expect(code).to.equal(1)
          expect(stderr).to.include('the response is larger than 1 MiB')
        }
      )
    })

    it('exits 1 with usage on a bad option, command or argument', async () => {
      const npub_bad = 'npub1bad'
      for (const [args, error] of [
        [['--bogus'], 'Usage: nano-community'],
        [['nope'], 'Unknown command: nope'],
        [['update-account-meta', 'extra'], 'Usage: nano-community'],
        [['revoke-signing-key'], 'Usage: nano-community'],
        [['revoke-signing-key', 'xyz'], 'linked_public_key must be 64 hex'],
        [['update-block-meta', 'abc'], 'A 64 hex character block hash'],
        [['bind-nostr-key', npub_bad], 'Expected an npub']
      ]) {
        const { code, stdout, stderr } = await run({ args })
        expect(code, args.join(' ')).to.equal(1)
        expect(stderr, args.join(' ')).to.include(error)
        // refused before the key is read or a prompt is shown
        expect(stderr + stdout, args.join(' ')).to.not.include('Private key')
      }
    })

    it('reports a server rejection as one printable line and exits 1', async () => {
      await with_server(
        (req, res) => {
          res.writeHead(400)
          res.end(JSON.stringify({ error: 'no\u001b[2J\u009bpe' }))
        },
        async (url) => {
          const { code, stdout, stderr } = await run_cli(
            ['revoke-signing-key', linked_public_key],
            { input: lines('y'), env: { NANO_TEST_CLI_API_URL: url } }
          )
          expect(code).to.equal(1)
          expect(stderr).to.equal(`${key_prompt}no[2J\\u009bpe\n`)
          expect(stdout).to.not.include('successful')
        }
      )
    })

    it('sends nothing unless the answer is y or yes', async () => {
      let hits = 0
      await with_server(
        (req, res) => {
          hits += 1
          res.end('{}')
        },
        async (url) => {
          const env = { NANO_TEST_CLI_API_URL: url }
          for (const [answer, sends] of [
            ['yeah', false],
            ['', false],
            ['n', false],
            ['YES', true],
            [' y ', true]
          ]) {
            const before = hits
            const { code } = await run_cli(
              ['revoke-signing-key', linked_public_key],
              { input: lines(answer), env }
            )
            expect(code, answer).to.equal(0)
            expect(hits - before, `answer '${answer}'`).to.equal(sends ? 1 : 0)
          }
          // add-signing-key shows both payloads, and a no prints no key
          const before = hits
          const { code, stdout, stderr } = await run_cli(['add-signing-key'], {
            input: lines('n'),
            env
          })
          expect(code).to.equal(0)
          expect(hits).to.equal(before)
          expect(stdout).to.include('"action": "link_key"')
          expect(stdout).to.include('"action": "accept_link"')
          expect(stdout).to.not.include('Signing public key')
          expect(stderr).to.equal(key_prompt)
        }
      )
    })

    it('fails when input ends before a field or an edited value', async () => {
      for (const [input, error] of [
        ['', 'Input ended before every field'],
        [lines('Alias', 'y', 'alias'), 'Input ended before the new value']
      ]) {
        const { code, stderr } = await run_cli(['update-account-meta'], {
          input
        })
        expect(code).to.equal(1)
        expect(stderr).to.include(error)
      }
    })

    it('asks again for a field name it does not know', async () => {
      const { code, stdout } = await run_cli(['update-account-meta'], {
        input: lines('Alias', 'y', 'bogus', 'n', 'n')
      })
      expect(code).to.equal(0)
      expect(stdout).to.include('No field named bogus')
      expect(stdout).to.not.include('"bogus"')
    })

    it('rejects a malformed private key without printing it', async () => {
      const malformed_key = 'z'.repeat(64)
      const { code, stdout, stderr } = await run({
        args: ['revoke-signing-key', linked_public_key],
        key: malformed_key
      })
      expect(code).to.equal(1)
      expect(stderr).to.include('must be 64 hex characters')
      expect(stdout + stderr).to.not.include(malformed_key)
    })

    it('reads the private key from stdin and never echoes it', async () => {
      const npub =
        'npub10elfcs4fr0l0r8af98jlmgdh9c8tcxjvz9qkw038js35mp4dma8qzvjptg'
      const { code, stdout, stderr } = await run({
        args: ['bind-nostr-key', npub]
      })
      expect(code).to.equal(0)
      expect(stdout).to.include(nano_account_address)
      expect(stdout + stderr).to.not.include(nano_private_key)
    })

    it('refuses to run while the old key variable is set', async () => {
      for (const value of [nano_private_key, '']) {
        const { code, stdout, stderr } = await run(
          {
            args: ['revoke-signing-key', linked_public_key],
            input: lines('y')
          },
          { NC_CLI_NANO_PRIVATE_KEY: value }
        )
        expect(code).to.equal(1)
        expect(stderr).to.include('NC_CLI_NANO_PRIVATE_KEY is no longer read')
        expect(stdout).to.not.include('Sign and send?')
        expect(stdout + stderr).to.not.include(nano_private_key)
      }
    })

    // A terminal echoes what is typed unless the prompt mutes it. util-linux
    // script gives the CLI a pseudo-terminal; it is Linux only.
    ;(process.platform === 'linux' ? it : it.skip)(
      'does not echo a private key typed at a terminal',
      async () => {
        const npub =
          'npub10elfcs4fr0l0r8af98jlmgdh9c8tcxjvz9qkw038js35mp4dma8qzvjptg'
        const child = spawn(
          'script',
          ['-qfec', `node cli/index.mjs bind-nostr-key ${npub}`, '/dev/null'],
          { stdio: ['pipe', 'pipe', 'pipe'] }
        )
        let output = ''
        let typed = false
        child.stdout.on('data', (data) => {
          output += data.toString()
          if (!typed && output.includes('Private key (64 hex characters')) {
            typed = true
            child.stdin.write(`${nano_private_key}\r`)
          }
        })
        const code = await new Promise((resolve) => child.on('close', resolve))
        expect(code).to.equal(0)
        expect(output).to.include(nano_account_address)
        expect(output).to.not.include(nano_private_key.slice(0, 8))
      }
    )

    ;(process.platform === 'linux' ? it : it.skip)(
      'shows the prompts again after the hidden key prompt',
      async () => {
        const child = spawn(
          'script',
          [
            '-qfec',
            `node ${PUBLISHED_BIN} revoke-signing-key ${linked_public_key}`,
            '/dev/null'
          ],
          { stdio: ['pipe', 'pipe', 'pipe'] }
        )
        let output = ''
        let typed_key = false
        let answered = false
        child.stdout.on('data', (data) => {
          output += data.toString()
          if (!typed_key && output.includes('Private key (64 hex characters')) {
            typed_key = true
            child.stdin.write(`${nano_private_key}\r`)
          }
          if (!answered && output.includes('Sign and send? (y/N)')) {
            answered = true
            child.stdin.write('n\r')
          }
        })
        const code = await new Promise((resolve) => child.on('close', resolve))
        expect(code).to.equal(0)
        expect(answered, output).to.equal(true)
        expect(output).to.include('Cancelled. Nothing was signed or sent.')
        expect(output).to.not.include(nano_private_key.slice(0, 8))
      }
    )

    it('refuses a redirect rather than resend the signed message', async () => {
      let target_hits = 0
      const target = http.createServer((req, res) => {
        target_hits += 1
        res.end('{}')
      })
      const redirector = http.createServer((req, res) => {
        res.writeHead(307, {
          Location: `http://127.0.0.1:${target.address().port}${req.url}`
        })
        res.end()
      })
      await new Promise((resolve) => target.listen(0, '127.0.0.1', resolve))
      await new Promise((resolve) => redirector.listen(0, '127.0.0.1', resolve))
      try {
        const { code, stderr } = await run_cli(
          ['revoke-signing-key', linked_public_key],
          {
            input: lines('y'),
            env: {
              NANO_TEST_CLI_API_URL: `http://127.0.0.1:${redirector.address().port}`
            }
          }
        )
        expect(code).to.equal(1)
        expect(stderr).to.include('request failed: unexpected redirect')
        expect(target_hits).to.equal(0)
      } finally {
        target.close()
        redirector.close()
      }
    })
  })
})
