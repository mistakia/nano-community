/* global describe, before, after, it */
import chai from 'chai'
import { exec, spawn } from 'child_process'
import util from 'util'

import server from '#api/server.mjs'
import config from '#config'

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

  before(() => {
    process.env.NANO_PRIVATE_KEY =
      '1111111111111111111111111111111111111111111111111111111111111111'

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
    it('should send a message for update-rep-meta operation', async () => {
      let stdout = ''
      let stderr = ''
      try {
        const child = spawn('node', ['cli/index.mjs', 'update-rep-meta'], {
          stdio: ['pipe', 'pipe', 'pipe']
        })
        child.stdin.setDefaultEncoding('utf-8')
        child.stdout.on('data', (data) => {
          const output = strip_ansi_escape_codes(data.toString())

          switch (output) {
            case '? Alias:':
              child.stdin.write('TestNodeAlias\n')
              break
            case '? Description:':
              child.stdin.write('A test node for development purposes.\n')
              break
            case '? Donation Address:':
              child.stdin.write(
                'nano_3niceeeyiaaif5xoiqjvth5gqrypuwytrm867asbciw3ndz8j3mazqqk6cok\n'
              )
              break
            case '? CPU Model:':
              child.stdin.write('Intel i7\n')
              break
            case '? CPU Cores:':
              child.stdin.write('4\n')
              break
            case '? RAM Amount:':
              child.stdin.write('16GB\n')
              break
            case '? Reddit Username:':
              child.stdin.write('test_reddit_user\n')
              break
            case '? Twitter Username:':
              child.stdin.write('test_twitter_user\n')
              break
            case '? Discord Username:':
              child.stdin.write('test_discord_user#1234\n')
              break
            case '? GitHub Username:':
              child.stdin.write('test_github_user\n')
              break
            case '? Email:':
              child.stdin.write('test@example.com\n')
              break
            case '? Website URL:':
              child.stdin.write('https://example.com\n')
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
