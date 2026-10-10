import debug from 'debug'

import update_account from './update-account.mjs'
import update_representative_meta from './update-representative-meta.mjs'

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

// Applies a verified message. content is parameters.content of the signed
// payload, and account is the account the signer acts for.
export default async function process_community_message({
  action,
  content,
  account
}) {
  switch (action) {
    case 'set_account_meta':
      return process_set_account_meta({ content, account })

    case 'set_representative_meta':
      return process_set_representative_meta({ content, account })

    default:
      log(`Unsupported message action: ${action}`)
  }
}
