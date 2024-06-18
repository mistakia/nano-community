#!/usr/bin/env node

import yargs from 'yargs'
import crypto from 'crypto'
import { hideBin } from 'yargs/helpers'
import inquirer from 'inquirer'
import process from 'process'

import sign_nano_community_link_key from '#common/sign-nano-community-link-key.mjs'
import sign_nano_community_revoke_key from '#common/sign-nano-community-revoke-key.mjs'
import sign_nano_community_message from '#common/sign-nano-community-message.mjs'
import encode_nano_address from '#common/encode-nano-address.mjs'
import request from '#common/request.mjs'
import ed25519 from '@trashman/ed25519-blake2b'

const is_test = process.env.NODE_ENV === 'test'

const base_url = is_test ? 'http://localhost:8080' : 'https://nano.community'

const load_private_key = async () => {
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

const send_message_handler = async (type, block_hash = null) => {
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
  .scriptName('nano-cli')
  .usage('$0 <cmd> [args]')
  .command(add_signing_key)
  .command(revoke_signing_key)
  .command(update_rep_meta)
  .command(update_account_meta)
  .command(update_block_meta)
  .help('h')
  .wrap(100)
  .alias('h', 'help').argv
