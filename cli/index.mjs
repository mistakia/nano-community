#!/usr/bin/env node

import crypto from 'crypto'
import process from 'process'

import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import inquirer from 'inquirer'
import fetch, { Request } from 'node-fetch'
import {
  encode_nano_account,
  get_public_key,
  sign_message
} from 'nano-signed-message'

const is_test = process.env.NODE_ENV === 'test'

const base_url =
  process.env.NC_CLI_API_URL ||
  (is_test ? 'http://localhost:8085' : 'https://nano.community')

const PUBLIC_KEY_RE = /^[0-9a-f]{64}$/

// Signs a nano.community request in the canonical Nano signed-message format
// (https://github.com/mistakia/nano-signed-message), with a fresh nonce
function sign_request({ private_key, action, parameters }) {
  const public_key = get_public_key(Buffer.from(private_key, 'hex'))
  return sign_message({
    private_key,
    payload: {
      version: 1,
      domain: 'nano.community',
      action,
      account: encode_nano_account(public_key),
      issued_at: Math.floor(Date.now() / 1000),
      nonce: crypto.randomBytes(16).toString('hex'),
      parameters
    }
  })
}

async function request(options) {
  const request = new Request(options.url, {
    timeout: 20000,
    ...options
  })
  const response = await fetch(request)

  if (response.status >= 200 && response.status < 300) {
    return response.json()
  } else {
    const res = await response.json()
    const error = new Error(res.error || response.statusText)
    error.response = response
    throw error
  }
}

async function load_private_key() {
  let private_key = process.env.NC_CLI_NANO_PRIVATE_KEY
  if (private_key) {
    console.log('Private key found in environment variable.')
  } else {
    console.log(
      'No private key found in environment variable (NC_CLI_NANO_PRIVATE_KEY).'
    )
    // Restore stdin for inquirer
    const answers = await inquirer.prompt([
      {
        type: 'password',
        name: 'private_key',
        message: 'Please enter your private key:'
      }
    ])
    private_key = answers.private_key
  }

  const public_key = Buffer.from(
    get_public_key(Buffer.from(private_key, 'hex'))
  ).toString('hex')
  return {
    private_key,
    public_key,
    nano_account_address: encode_nano_account(public_key)
  }
}

const add_signing_key = {
  command: 'add-signing-key',
  describe: 'Add a new signing key',
  handler: async () => {
    const { private_key, nano_account_address } = await load_private_key()

    const linked_private_key = crypto.randomBytes(32).toString('hex')
    const linked_public_key = Buffer.from(
      get_public_key(Buffer.from(linked_private_key, 'hex'))
    ).toString('hex')

    // The account consents to the key, and the key consents to the account
    const payload = {
      link: sign_request({
        private_key,
        action: 'link_key',
        parameters: { linked_public_key }
      }),
      accept: sign_request({
        private_key: linked_private_key,
        action: 'accept_link',
        parameters: { linked_account: nano_account_address }
      })
    }

    try {
      const response = await request({
        url: `${base_url}/api/auth/register/key`,
        method: 'POST',
        body: JSON.stringify(payload),
        headers: {
          'Content-Type': 'application/json'
        }
      })
      console.log('Key registration successful:', response)
    } catch (error) {
      console.error(`Failed to register key: ${error.message || error}`)
      return
    }

    console.log({ linked_public_key, linked_private_key })
  }
}

const revoke_signing_key = {
  command: 'revoke-signing-key <linked_public_key>',
  describe: 'Revoke an existing signing key',
  builder: (yargs) =>
    yargs.positional('linked_public_key', {
      describe: 'Public key of the signing key to revoke',
      type: 'string'
    }),
  handler: async ({ linked_public_key }) => {
    linked_public_key = String(linked_public_key).toLowerCase()
    if (!PUBLIC_KEY_RE.test(linked_public_key)) {
      console.error('linked_public_key must be 64 hex characters')
      return
    }

    const { private_key } = await load_private_key()

    // Confirm revocation
    const answers = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm_revoke',
        message: `Are you sure you want to revoke the signing key: ${linked_public_key}?`,
        default: false
      }
    ])

    if (answers.confirm_revoke) {
      console.log('Revoking signing key...')
      const payload = sign_request({
        private_key,
        action: 'revoke_key',
        parameters: { linked_public_key }
      })

      try {
        const response = await request({
          url: `${base_url}/api/auth/revoke/key`,
          method: 'POST',
          body: JSON.stringify(payload),
          headers: {
            'Content-Type': 'application/json'
          }
        })
        console.log('Key revocation successful:', response)
      } catch (error) {
        console.error(`Failed to revoke key: ${error.message || error}`)
      }
    } else {
      console.log('Signing key revocation cancelled.')
    }
  }
}

const update_rep_meta = {
  command: 'update-rep-meta',
  describe: 'Update representative metadata',
  handler: async () => await send_message_handler('update-rep-meta')
}

const update_account_meta = {
  command: 'update-account-meta',
  describe: 'Update account metadata',
  handler: async () => await send_message_handler('update-account-meta')
}

const update_block_meta = {
  command: 'update-block-meta <block_hash>',
  describe: 'Update block metadata',
  builder: (yargs) =>
    yargs.positional('block_hash', {
      describe: 'Block hash for update-block-meta type',
      type: 'string'
    }),
  handler: async ({ block_hash }) =>
    await send_message_handler('update-block-meta', block_hash)
}

async function send_message_handler(type, block_hash = null) {
  const { private_key } = await load_private_key()

  let message_content_prompts = []
  console.log(`Sending message of type: ${type}`)
  switch (type) {
    case 'update-rep-meta':
      message_content_prompts = [
        { name: 'alias', message: 'Alias:' },
        { name: 'description', message: 'Description:' },
        { name: 'donation_address', message: 'Donation Address:' },
        { name: 'cpu_model', message: 'CPU Model:' },
        { name: 'cpu_cores', message: 'CPU Cores:' },
        { name: 'ram', message: 'RAM Amount (GB):' },
        { name: 'reddit', message: 'Reddit Username:' },
        { name: 'twitter', message: 'Twitter Username:' },
        { name: 'discord', message: 'Discord Username:' },
        { name: 'github', message: 'GitHub Username:' },
        { name: 'email', message: 'Email:' },
        { name: 'website', message: 'Website URL:' }
      ]
      break
    case 'update-account-meta':
      message_content_prompts = [{ name: 'alias', message: 'Alias:' }]
      break
    case 'update-block-meta':
      block_hash = String(block_hash || '').toLowerCase()
      if (!PUBLIC_KEY_RE.test(block_hash)) {
        console.error('A 64 hex character block hash is required')
        return
      }
      message_content_prompts = [{ name: 'note', message: 'Note:' }]
      break
    default:
      console.error('Unknown message type')
      return
  }

  const message_content = await inquirer.prompt(message_content_prompts)
  let confirm_edit = false
  do {
    console.log('Please review your message content:', message_content)
    confirm_edit = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'edit',
        message: 'Would you like to edit any field?',
        default: false
      }
    ])
    confirm_edit = confirm_edit.edit
    if (confirm_edit) {
      const field_to_edit = await inquirer.prompt([
        {
          type: 'list',
          name: 'field',
          message: 'Which field would you like to edit?',
          choices: message_content_prompts.map((prompt) => prompt.name)
        }
      ])
      const new_value = await inquirer.prompt([
        {
          name: 'new_value',
          message: `Enter new value for ${field_to_edit.field}:`
        }
      ])
      message_content[field_to_edit.field] = new_value.new_value
    }
  } while (confirm_edit)

  const actions = {
    'update-rep-meta': 'set_representative_meta',
    'update-account-meta': 'set_account_meta',
    'update-block-meta': 'set_block_meta'
  }
  const payload = sign_request({
    private_key,
    action: actions[type],
    parameters: {
      content: message_content,
      references: type === 'update-block-meta' ? [block_hash] : [],
      tags: []
    }
  })

  try {
    const response = await request({
      url: `${base_url}/api/auth/message`,
      method: 'POST',
      body: JSON.stringify(payload),
      headers: {
        'Content-Type': 'application/json'
      }
    })
    console.log('Message sent successful:', response)
  } catch (error) {
    console.error(`Failed to send message: ${error.message || error}`)
  }
}

// eslint-disable-next-line no-unused-expressions
yargs(hideBin(process.argv))
  .scriptName('nano-community')
  .usage('$0 <cmd> [args]')
  .command(add_signing_key)
  .command(revoke_signing_key)
  .command(update_rep_meta)
  .command(update_account_meta)
  .command(update_block_meta)
  .demandCommand(1, 'You must provide at least one command.')
  .help('h')
  .wrap(100)
  .alias('h', 'help').argv
