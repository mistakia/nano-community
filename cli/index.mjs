#!/usr/bin/env node

import crypto from 'crypto'
import process from 'process'

import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import inquirer from 'inquirer'
import fetch, { Request } from 'node-fetch'
import ed25519 from '@trashman/ed25519-blake2b'

const is_test = process.env.NODE_ENV === 'test'

const base_url = is_test ? 'http://localhost:8080' : 'https://nano.community'

function sign_nano_community_link_key({
  linked_public_key,
  nano_account,
  nano_account_private_key,
  nano_account_public_key
}) {
  if (!linked_public_key) {
    throw new Error('linked_public_key is required')
  }

  if (!nano_account) {
    throw new Error('nano_account is required')
  }

  if (!nano_account_private_key) {
    throw new Error('nano_account_private_key is required')
  }

  if (!nano_account_public_key) {
    throw new Error('nano_account_public_key is required')
  }

  const data = Buffer.from(['LINK', nano_account, linked_public_key])

  const message_hash = ed25519.hash(data)

  return ed25519.sign(
    message_hash,
    nano_account_private_key,
    nano_account_public_key
  )
}

function sign_nano_community_revoke_key({
  linked_public_key,
  either_private_key,
  either_public_key
}) {
  if (!linked_public_key) {
    throw new Error('linked_public_key is required')
  }

  if (!either_private_key) {
    throw new Error('either_private_key is required')
  }

  if (!either_public_key) {
    throw new Error('either_public_key is required')
  }

  const data = Buffer.from(['REVOKE', linked_public_key])

  const message_hash = ed25519.hash(data)

  return ed25519.sign(message_hash, either_private_key, either_public_key)
}

function sign_nano_community_message(message, private_key) {
  const {
    entry_id,
    chain_id,
    entry_clock,
    chain_clock,
    public_key,
    operation,
    content,
    tags,
    references,
    created_at
  } = message

  const data = Buffer.from([
    entry_id,
    chain_id,
    entry_clock,
    chain_clock,
    public_key,
    operation,
    content,
    tags,
    references,
    created_at
  ])

  const message_hash = ed25519.hash(data)

  return ed25519.sign(message_hash, private_key, public_key)
}

function encode_nano_base32(view) {
  const length = view.length
  const leftover = (length * 8) % 5
  const offset = leftover === 0 ? 0 : 5 - leftover
  const alphabet = '13456789abcdefghijkmnopqrstuwxyz'

  let value = 0
  let output = ''
  let bits = 0

  for (let i = 0; i < length; i++) {
    value = (value << 8) | view[i]
    bits += 8

    while (bits >= 5) {
      output += alphabet[(value >>> (bits + offset - 5)) & 31]
      bits -= 5
    }
  }

  if (bits > 0) {
    output += alphabet[(value << (5 - (bits + offset))) & 31]
  }

  return output
}

function encode_nano_address({ public_key_buf, prefix = 'nano_' }) {
  const encoded_public_key = encode_nano_base32(public_key_buf)
  const checksum = ed25519.hash(public_key_buf, 5).reverse()
  const encoded_checksum = encode_nano_base32(checksum)
  return prefix + encoded_public_key + encoded_checksum
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

  const public_key_buf = ed25519.publicKey(Buffer.from(private_key, 'hex'))
  const nano_account_address = encode_nano_address({ public_key_buf })
  return {
    private_key,
    public_key: public_key_buf.toString('hex'),
    nano_account_address
  }
}

const add_signing_key = {
  command: 'add-signing-key',
  describe: 'Add a new signing key',
  handler: async () => {
    const { private_key, public_key, nano_account_address } =
      await load_private_key()

    const linked_private_key = crypto.randomBytes(32)
    const linked_public_key = ed25519.publicKey(linked_private_key)

    const signature = sign_nano_community_link_key({
      linked_public_key,
      nano_account: nano_account_address,
      nano_account_private_key: private_key,
      nano_account_public_key: public_key
    })

    const payload = {
      public_key: linked_public_key.toString('hex'),
      signature: signature.toString('hex'),
      account: nano_account_address
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
    }

    console.log({
      linked_public_key: linked_public_key.toString('hex'),
      linked_private_key: linked_private_key.toString('hex')
    })
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
    const { private_key, public_key } = await load_private_key()

    // Confirm revocation
    const answers = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm_revoke',
        message: `Are you sure you want to revoke the signing key: ${public_key}?`,
        default: false
      }
    ])

    if (answers.confirm_revoke) {
      console.log('Revoking signing key...')
      const signature = sign_nano_community_revoke_key({
        linked_public_key,
        either_private_key: private_key,
        either_public_key: public_key
      })

      const payload = {
        public_key: linked_public_key.toString('hex'),
        signature: signature.toString('hex')
      }

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
  const { private_key, public_key } = await load_private_key()

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
      if (!block_hash) {
        console.error('Block hash is required for update-block-meta type')
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

  // Include block_hash in message for update-block-meta type
  if (type === 'update-block-meta') {
    message_content.block_hash = block_hash
  }

  // Adjust operation to match allowed operations
  let operation = ''
  switch (type) {
    case 'update-rep-meta':
      operation = 'SET_REPRESENTATIVE_META'
      break
    case 'update-account-meta':
      operation = 'SET_ACCOUNT_META'
      break
    case 'update-block-meta':
      operation = 'SET_BLOCK_META'
      break
  }

  const message = {
    version: 1,
    created_at: Math.floor(Date.now() / 1000),
    public_key, // public key of signing key
    operation,
    content: JSON.stringify(message_content)
  }

  const signature = sign_nano_community_message(message, private_key)
  const payload = {
    ...message,
    signature: signature.toString('hex')
  }

  try {
    const response = await request({
      url: `${base_url}/api/auth/message`,
      method: 'POST',
      body: JSON.stringify({ message: payload }),
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
