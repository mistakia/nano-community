// base-secret-scan: declared-fixture
// The nano private key below is a synthetic repeated-byte test key; it is not a
// real credential.

/* global describe, before, after, it */
import chai from 'chai'
import { exec, spawn } from 'child_process'
import http from 'http'
import util from 'util'

import server from '#api/server.mjs'
import config from '#config'
import db from '#db'
import { stub_block_info } from './utils/stub-block-info.mjs'

const { port } = config
const exec_promise = util.promisify(exec)

process.env.NODE_ENV = 'test'
const expect = chai.expect

// The CLI prints its private key status line on stderr, so stdout stays
// machine-readable, and before a send it warns that NC_CLI_API_URL points
// away from nano.community
const private_key_status = 'Private key found in environment variable.\n'
const send_stderr = `${private_key_status}Warning: NC_CLI_API_URL sends to http://localhost:${port}, not https://nano.community\n`

function strip_ansi_escape_codes(str) {
  const last_newline_index = str.lastIndexOf('\n')
  if (last_newline_index !== -1) {
    str = str.substring(last_newline_index + 1)
  }
  return str
    .replace(
      // eslint-disable-next-line no-control-regex
      /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g,
      ''
    )
    .trim()
}

describe('CLI', function () {
  this.timeout(30000)

  let new_signing_key
  const nano_private_key =
    '1111111111111111111111111111111111111111111111111111111111111111'
  const nano_account_address =
    'nano_3d78japo7ziqqcsptk47eonzwzwjyaydcywq5ebzowjpxgyehynnjc9pd5zj'

  before(
    () =>
      new Promise((resolve) => {
        process.env.NC_CLI_NANO_PRIVATE_KEY = nano_private_key
        // The CLI children call the test server on its configured port
        process.env.NC_CLI_API_URL = `http://localhost:${port}`

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
      const { stdout, stderr } = await exec_promise(
        'echo y | node cli/index.mjs add-signing-key'
      )

      expect(stderr).to.equal(send_stderr)
      expect(stdout).to.include('Key registration successful')
      expect(stdout).to.not.include(nano_private_key)

      // Extract the new signing key from stdout
      const match = stdout.match(/linked_public_key: '([a-f0-9]+)'/)
      if (match) {
        new_signing_key = match[1] // Simplified extraction logic
      }

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
      const { stdout, stderr } = await exec_promise(
        `echo y | node cli/index.mjs revoke-signing-key ${new_signing_key}`
      )
      expect(stderr).to.equal(send_stderr)
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
      let stdout = ''
      let stderr = ''
      const expected_alias = 'TestNodeAlias'
      const expected_description = 'A test node for development purposes.'
      const expected_donation_address =
        'nano_3niceeeyiaaif5xoiqjvth5gqrypuwytrm867asbciw3ndz8j3mazqqk6cok'
      const expected_cpu_model = 'Intel i7'
      const expected_cpu_cores = 4
      const expected_ram = 16
      const expected_reddit = 'test_reddit_user'
      const expected_twitter = 'test_twitter_user'
      const expected_discord = 'test_discord_user#1234'
      const expected_discord_user_id = '123456789012345678'
      const expected_github = 'test_github_user'
      const expected_email = 'test@example.com'
      const expected_website = 'https://example.com'

      try {
        const child = spawn('node', ['cli/index.mjs', 'update-rep-meta'], {
          stdio: ['pipe', 'pipe', 'pipe']
        })
        child.stdin.setDefaultEncoding('utf-8')
        child.stdout.on('data', (data) => {
          const output = strip_ansi_escape_codes(data.toString())

          switch (output) {
            case '? Alias:':
              child.stdin.write(`${expected_alias}\n`)
              break
            case '? Description:':
              child.stdin.write(`${expected_description}\n`)
              break
            case '? Donation Address:':
              child.stdin.write(`${expected_donation_address}\n`)
              break
            case '? CPU Model:':
              child.stdin.write(`${expected_cpu_model}\n`)
              break
            case '? CPU Cores:':
              child.stdin.write(`${expected_cpu_cores}\n`)
              break
            case '? RAM Amount (GB):':
              child.stdin.write(`${expected_ram}\n`)
              break
            case '? Reddit Username:':
              child.stdin.write(`${expected_reddit}\n`)
              break
            case '? Twitter Username:':
              child.stdin.write(`${expected_twitter}\n`)
              break
            case '? Discord Username:':
              child.stdin.write(`${expected_discord}\n`)
              break
            case '? Discord User ID:':
              child.stdin.write(`${expected_discord_user_id}\n`)
              break
            case '? GitHub Username:':
              child.stdin.write(`${expected_github}\n`)
              break
            case '? Email:':
              child.stdin.write(`${expected_email}\n`)
              break
            case '? Website URL:':
              child.stdin.write(`${expected_website}\n`)
              break
            case '? Would you like to edit any field? (y/N)':
              child.stdin.write('N\n')
              break
            case '? Sign and send? (y/N)':
              child.stdin.write('y\n')
              child.stdin.end()
              break
          }
        })

        child.stderr.on('data', (data) => {
          stderr += data.toString()
        })

        child.stdout.on('data', (data) => {
          stdout += data.toString()
        })

        const exit_code = await new Promise((resolve) => {
          child.on('close', resolve)
        })

        expect(stderr).to.equal(send_stderr)
        expect(exit_code).to.equal(0)

        // Check database for updated columns
        const updated_account = await db('accounts')
          .where({ account: nano_account_address })
          .first()
        expect(updated_account.alias).to.equal(expected_alias)

        const updated_representative = await db('representatives_meta_index')
          .where({ account: nano_account_address })
          .first()

        expect(updated_representative.description).to.equal(
          expected_description
        )
        expect(updated_representative.donation_address).to.equal(
          expected_donation_address
        )
        expect(updated_representative.cpu_model).to.equal(expected_cpu_model)
        expect(updated_representative.cpu_cores).to.equal(expected_cpu_cores)
        expect(updated_representative.ram).to.equal(expected_ram)
        expect(updated_representative.reddit).to.equal(expected_reddit)
        expect(updated_representative.twitter).to.equal(expected_twitter)
        expect(updated_representative.discord).to.equal(expected_discord)
        expect(updated_representative.discord_user_id).to.equal(
          expected_discord_user_id
        )
        expect(updated_representative.github).to.equal(expected_github)
        expect(updated_representative.email).to.equal(expected_email)
        expect(updated_representative.website).to.equal(expected_website)
      } catch (err) {
        console.log(err)
        console.log(stderr)
        console.log(stdout)
        throw err
      }
    })
  })

  describe('update-account-meta operation', () => {
    it('should send a message for update-account-meta operation', async () => {
      let stderr = ''
      let stdout = ''
      try {
        const child = spawn('node', ['cli/index.mjs', 'update-account-meta'], {
          stdio: ['pipe', 'pipe', 'pipe']
        })
        child.stdin.setDefaultEncoding('utf-8')
        child.stdout.on('data', (data) => {
          const output = strip_ansi_escape_codes(data.toString().trim())
          switch (output) {
            case '? Alias:':
              child.stdin.write('Alias\n')
              break
            case '? Would you like to edit any field? (y/N)':
              child.stdin.write('n\n')
              break
            case '? Sign and send? (y/N)':
              child.stdin.write('y\n')
              child.stdin.end()
              break
          }
        })

        child.stderr.on('data', (data) => {
          stderr += data.toString()
        })

        child.stdout.on('data', (data) => {
          stdout += data.toString()
        })

        const exit_code = await new Promise((resolve) => {
          child.on('close', resolve)
        })

        expect(stderr).to.equal(send_stderr)
        expect(exit_code).to.equal(0)

        const row = await db('nano_community_messages')
          .where({ operation: 'SET_ACCOUNT_META', version: 2 })
          .whereRaw('message like ?', [`%${nano_account_address}%`])
          .first()
        expect(JSON.parse(row.content)).to.deep.equal({ alias: 'Alias' })
      } catch (err) {
        console.log(err)
        console.log(stdout)
        console.log(stderr)
        throw err
      }
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
      let stdout = ''
      let stderr = ''

      try {
        const child = spawn(
          'node',
          ['cli/index.mjs', 'update-block-meta', block_hash],
          { stdio: ['pipe', 'pipe', 'pipe'] }
        )
        child.stdin.setDefaultEncoding('utf-8')
        child.stdout.on('data', (data) => {
          const output = strip_ansi_escape_codes(data.toString().trim())
          switch (output) {
            case '? Note:':
              child.stdin.write('Test note for update-block-meta operation\n')
              break
            case '? Would you like to edit any field? (y/N)':
              child.stdin.write('n\n')
              break
            case '? Sign and send? (y/N)':
              child.stdin.write('y\n')
              child.stdin.end()
              break
          }
        })

        child.stderr.on('data', (data) => {
          stderr += data.toString()
        })

        child.stdout.on('data', (data) => {
          stdout += data.toString()
        })

        const exit_code = await new Promise((resolve) => {
          child.on('close', resolve)
        })

        expect(stderr).to.equal(send_stderr)
        expect(exit_code).to.equal(0)

        const row = await db('nano_community_messages')
          .where({ operation: 'SET_BLOCK_META', version: 2 })
          .where({ references: block_hash.toLowerCase() })
          .first()
        expect(row.references).to.equal(block_hash.toLowerCase())
      } catch (err) {
        console.log(err)
        console.log(stderr)
        console.log(stdout)
        throw err
      }
    })
  })

  describe('update-representative-power-reading operation', () => {
    before(() =>
      db('accounts')
        .insert({ account: nano_account_address, representative: true })
        .onConflict('account')
        .merge(['representative'])
    )

    it('signs a number and integer epoch seconds after an edited field', async () => {
      let stdout = ''
      let stderr = ''
      const ended_at = Math.floor(Date.now() / 1000) - 3600
      const started_at = ended_at - 2 * 24 * 60 * 60
      const iso = (seconds) => new Date(seconds * 1000).toISOString()

      try {
        const child = spawn(
          'node',
          ['cli/index.mjs', 'update-representative-power-reading'],
          { stdio: ['pipe', 'pipe', 'pipe'] }
        )
        child.stdin.setDefaultEncoding('utf-8')
        // Each prompt re-renders as its answer is echoed, so answer each one
        // once: the edit question once per review of the content
        const answered = new Set()
        const answer_once = (key, text) => {
          if (!answered.has(key)) {
            answered.add(key)
            child.stdin.write(text)
          }
        }
        child.stdout.on('data', (data) => {
          const chunk = data.toString()
          stdout += chunk
          const reviews =
            stdout.split('Please review your message content').length - 1
          // A chunk can end one prompt and start the next, so match the
          // prompt on its last line
          const output = chunk.slice(chunk.lastIndexOf('\n') + 1)
          if (output.includes('? Which field?')) {
            answer_once('field', 'measurement_ended_at\n')
          } else if (output.includes('? Energy used over the window')) {
            answer_once('energy', '2000\n')
          } else if (output.includes('? Measurement method')) {
            answer_once('method', 'wall_meter\n')
          } else if (output.includes('? Measurement start')) {
            answer_once('start', `${iso(started_at)}\n`)
          } else if (output.includes('? Measurement end')) {
            // A first answer the edit below replaces
            answer_once('end', `${iso(ended_at - 60)}\n`)
          } else if (output.includes('Would you like to edit any field?')) {
            answer_once(`edit-${reviews}`, reviews === 1 ? 'y\n' : 'n\n')
          } else if (output.includes('Enter new value for')) {
            answer_once('new value', `${iso(ended_at)}\n`)
          } else if (output.includes('? Sign and send?')) {
            answer_once('send', 'y\n')
          }
        })

        child.stderr.on('data', (data) => {
          stderr += data.toString()
        })

        const exit_code = await new Promise((resolve) => {
          child.on('close', resolve)
        })

        expect(stderr).to.equal(send_stderr)
        expect(exit_code).to.equal(0)
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
      } catch (err) {
        console.log(err)
        console.log(stderr)
        console.log(stdout)
        throw err
      }
    })
  })

  describe('report-representative-hardware operation', () => {
    it('collects the host details and sends nothing when cancelled', async () => {
      const { stdout } = await exec_promise(
        'echo n | node cli/index.mjs report-representative-hardware'
      )
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
      expect(stdout).to.include('Message cancelled.')

      const rows = await db('nano_community_messages')
        .where({ operation: 'SET_REPRESENTATIVE_HARDWARE' })
        .whereRaw('message like ?', [`%${nano_account_address}%`])
      expect(rows).to.have.length(0)
    })
  })
  describe('safety', () => {
    const run = async (command, env = {}) => {
      try {
        const { stdout, stderr } = await exec_promise(command, {
          env: { ...process.env, ...env }
        })
        return { code: 0, stdout, stderr }
      } catch (error) {
        return { code: error.code, stdout: error.stdout, stderr: error.stderr }
      }
    }
    const linked_public_key = 'ab'.repeat(32)

    it('refuses an API URL that is not https or a local http server', async () => {
      const { code, stdout, stderr } = await run(
        `echo y | node cli/index.mjs revoke-signing-key ${linked_public_key}`,
        { NC_CLI_API_URL: 'http://example.com' }
      )
      expect(code).to.equal(1)
      expect(stderr).to.include('NC_CLI_API_URL must be https')
      expect(stdout).to.not.include('Key revocation successful')
      for (const url of ['http://localhost.example.com', 'ftp://localhost']) {
        const refused = await run(
          `echo y | node cli/index.mjs revoke-signing-key ${linked_public_key}`,
          { NC_CLI_API_URL: url }
        )
        expect(refused.code, url).to.equal(1)
      }
    })

    it('rejects a malformed private key without printing it', async () => {
      const malformed_key = 'z'.repeat(64)
      const { code, stdout, stderr } = await run(
        `node cli/index.mjs revoke-signing-key ${linked_public_key}`,
        { NC_CLI_NANO_PRIVATE_KEY: malformed_key }
      )
      expect(code).to.equal(1)
      expect(stderr).to.include('must be 64 hex characters')
      expect(stdout + stderr).to.not.include(malformed_key)
    })

    it('reads the private key from the prompt and never echoes it', async () => {
      const npub =
        'npub10elfcs4fr0l0r8af98jlmgdh9c8tcxjvz9qkw038js35mp4dma8qzvjptg'
      const { code, stdout, stderr } = await run(
        `echo ${nano_private_key} | node cli/index.mjs bind-nostr-key ${npub}`,
        { NC_CLI_NANO_PRIVATE_KEY: '' }
      )
      expect(code).to.equal(0)
      expect(stdout).to.include(nano_account_address)
      expect(stdout + stderr).to.not.include(nano_private_key)
    })

    // A terminal echoes what is typed unless the prompt mutes it. util-linux
    // script gives the CLI a pseudo-terminal; it is Linux only.
    ;(process.platform === 'linux' ? it : it.skip)(
      'does not echo a private key typed at a terminal',
      async () => {
        const npub =
          'npub10elfcs4fr0l0r8af98jlmgdh9c8tcxjvz9qkw038js35mp4dma8qzvjptg'
        const env = { ...process.env }
        delete env.NC_CLI_NANO_PRIVATE_KEY
        const child = spawn(
          'script',
          ['-qfec', `node cli/index.mjs bind-nostr-key ${npub}`, '/dev/null'],
          { env, stdio: ['pipe', 'pipe', 'pipe'] }
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
        const { code, stderr } = await run(
          `echo y | node cli/index.mjs revoke-signing-key ${linked_public_key}`,
          { NC_CLI_API_URL: `http://127.0.0.1:${redirector.address().port}` }
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
