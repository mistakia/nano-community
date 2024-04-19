#!/usr/bin/env node

import yargs from 'yargs'
import crypto from 'crypto'
import { hideBin } from 'yargs/helpers'
import inquirer from 'inquirer'
import process from 'process'
import nano from 'nanocurrency'

import {
  sign_nano_community_link_key,
  sign_nano_community_revoke_key,
  sign_nano_community_message
} from '#common'
import ed25519 from '@trashman/ed25519-blake2b'

const load_private_key = async () => {
  let private_key = process.env.NANO_PRIVATE_KEY
  if (private_key) {
    console.log('Private key found in environment variable.')
  } else {
    console.log('No private key found in environment variable or stdin.')
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

  const public_key = nano.derivePublicKey(private_key)
  const nano_account_address = nano.deriveAddress(public_key)
  return {
    private_key,
    public_key,
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

    console.log({
      private_key,
      public_key,
      nano_account_address,
      signature,
      linked_public_key,
      linked_private_key
    })

    // TODO send signed message to API
    // TODO print out the linked public key and private key
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
    const { private_key, public_key, nano_account_address } =
      await load_private_key()

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
        nano_account: nano_account_address,
        nano_account_private_key: private_key,
        nano_account_public_key: public_key
      })

      console.log({
        signature,
        linked_public_key,
        nano_account_address,
        private_key,
        public_key
      })

      // TODO send signed message to API
    } else {
      console.log('Signing key revocation cancelled.')
    }
  }
}

const send_message = {
  command: 'send-message <type> [block_hash]',
  describe: 'Send a message',
  builder: (yargs) =>
    yargs
      .positional('type', {
        describe: 'Type of message to send',
        choices: ['update-rep-meta', 'update-account-meta', 'update-block-meta']
      })
      .positional('block_hash', {
        describe: 'Block hash for update-block-meta type',
        type: 'string'
      }),
  handler: async (argv) => {
    const { private_key, public_key } = await load_private_key()

    // TODO fetch current values from API

    let message_content_prompts = []
    console.log(`Sending message of type: ${argv.type}`)
    switch (argv.type) {
      case 'update-rep-meta':
        message_content_prompts = [
          { name: 'alias', message: 'Alias:' },
          { name: 'description', message: 'Description:' },
          { name: 'donation_address', message: 'Donation Address:' },
          { name: 'cpu_model', message: 'CPU Model:' },
          { name: 'cpu_cores', message: 'CPU Cores:' },
          { name: 'ram_amount', message: 'RAM Amount:' },
          { name: 'reddit_username', message: 'Reddit Username:' },
          { name: 'twitter_username', message: 'Twitter Username:' },
          { name: 'discord_username', message: 'Discord Username:' },
          { name: 'github_username', message: 'GitHub Username:' },
          { name: 'email', message: 'Email:' },
          { name: 'website_url', message: 'Website URL:' }
        ]
        break
      case 'update-account-meta':
        message_content_prompts = [{ name: 'alias', message: 'Alias:' }]
        break
      case 'update-block-meta':
        if (!argv.block_hash) {
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
    if (argv.type === 'update-block-meta') {
      message_content.block_hash = argv.block_hash
    }

    const message = {
      created_at: Math.floor(Date.now() / 1000),
      public_key, // public key of signing key
      operation: argv.type.replace('-', '_'),
      content: message_content
    }

    const signature = sign_nano_community_message(message, private_key)

    console.log({
      message,
      signature
    })

    // TODO send signed message to API
  }
}

// eslint-disable-next-line no-unused-expressions
yargs(hideBin(process.argv))
  .scriptName('nano-cli')
  .usage('$0 <cmd> [args]')
  .command(add_signing_key)
  .command(revoke_signing_key)
  .command(send_message)
  .help('h')
  .alias('h', 'help').argv
