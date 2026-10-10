import debug from 'debug'

import update_account from './update-account.mjs'
import update_representative_meta from './update-representative-meta.mjs'
import process_set_block_meta from './process-set-block-meta.mjs'

const log = debug('process-community-message')

const process_set_representative_meta = async ({ content, account }) => {
  const { alias } = content
  if (alias) {
    await update_account({
      account_address: account,
      update: { alias }
    })
  }

  const {
    cpu_cores,
    description,
    donation_address,
    cpu_model,
    ram,
    reddit,
    twitter,
    discord,
    github,
    email,
    website
  } = content

  await update_representative_meta({
    representative_account_address: account,
    update: {
      cpu_cores,
      description,
      donation_address,
      cpu_model,
      ram,
      reddit,
      twitter,
      discord,
      github,
      email,
      website
    }
  })
}

const process_set_account_meta = async ({ content, account }) => {
  const { alias } = content
  if (alias) {
    await update_account({
      account_address: account,
      update: { alias }
    })
  }
}

// Applies a verified message. content and references are from the signed
// payload's parameters, and account is the account the signer acts for.
// get_block_account overrides the node lookup of a block's publisher.
export default async function process_community_message({
  action,
  content,
  references,
  account,
  issued_at,
  message_digest,
  get_block_account
}) {
  switch (action) {
    case 'set_account_meta':
      return process_set_account_meta({ content, account })

    case 'set_representative_meta':
      return process_set_representative_meta({ content, account })

    case 'set_block_meta':
      return process_set_block_meta({
        content,
        references,
        account,
        issued_at,
        message_digest,
        get_block_account
      })

    default:
      log(`Unsupported message action: ${action}`)
  }
}
