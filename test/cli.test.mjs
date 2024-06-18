/* global describe, before, after, it */
import chai from 'chai'
import { exec, spawn } from 'child_process'
import util from 'util'
import nock from 'nock'

import server from '#api/server.mjs'
import config from '#config'
import db from '#db'
import {
  REPRESENTATIVE_TRACKING_MINIMUM_VOTING_WEIGHT,
  ACCOUNT_TRACKING_MINIMUM_BALANCE
} from '#constants'

const { port } = config
const exec_promise = util.promisify(exec)

process.env.NODE_ENV = 'test'
const expect = chai.expect

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

  before(() => {
    process.env.NC_CLI_NANO_PRIVATE_KEY = nano_private_key

    server.listen(port, () => console.log(`API listening on port ${port}`))
  })

  after(() => {
    server.close()
  })

  describe('add-signing-key command', () => {
    it('should add a new signing key', async () => {
      const { stdout, stderr } = await exec_promise(
        'node cli/index.mjs add-signing-key'
      )

      // eslint-disable-next-line no-unused-expressions
      expect(stderr).to.be.empty
      expect(stdout).to.include('Key registration successful')

      // Extract the new signing key from stdout
      const match = stdout.match(/linked_public_key: '([a-f0-9]+)'/)
      if (match) {
        new_signing_key = match[1] // Simplified extraction logic
      }
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
      // eslint-disable-next-line no-unused-expressions
      expect(stderr).to.be.empty
      expect(stdout).to.include('Key revocation successful')
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
      const expected_github = 'test_github_user'
      const expected_email = 'test@example.com'
      const expected_website = 'https://example.com'

      try {
        // mock the account_info rpc request needed for message storing
        nock('http://nano:7076')
          .post('/', (body) => body.action === 'account_info')
          .reply(200, {
            weight: String(REPRESENTATIVE_TRACKING_MINIMUM_VOTING_WEIGHT)
          })

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
            case '? Confirm? (y/n)':
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

        // eslint-disable-next-line no-unused-expressions
        expect(stderr).to.be.empty
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
        // mock the account_info rpc request needed for message storing
        nock('http://nano:7076')
          .post('/', (body) => body.action === 'account_info')
          .reply(200, {
            balance: String(ACCOUNT_TRACKING_MINIMUM_BALANCE)
          })

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
            case '? Confirm? (y/n)':
              child.stdin.write('n\n')
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

        // eslint-disable-next-line no-unused-expressions
        expect(stderr).to.be.empty
        expect(exit_code).to.equal(0)
      } catch (err) {
        console.log(err)
        console.log(stdout)
        console.log(stderr)
        throw err
      }
    })
  })

  describe('update-block-meta operation', () => {
    it('should send a message for update-block-meta operation', async () => {
      let stdout = ''
      let stderr = ''
      const block_hash =
        '943E3EED4F340ECBF7E06FA2E74A3E17B1DC4148C6913403B8ACFE7FBB1C2139'

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
            case '? Confirm? (y/n)':
              child.stdin.write('n\n')
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

        // eslint-disable-next-line no-unused-expressions
        expect(stderr).to.be.empty
        expect(exit_code).to.equal(0)
      } catch (err) {
        console.log(err)
        console.log(stderr)
        console.log(stdout)
        throw err
      }
    })
  })
})
