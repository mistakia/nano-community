import debug from 'debug'

import update_account from './update-account.mjs'
import update_representative_meta from './update-representative-meta.mjs'

const log = debug('process-community-message')

const process_set_representative_meta = async ({
  message_content,
  message_account
}) => {
  if (!message_content) {
    log(
      `No message content found for SET_REPRESENTATIVE_META message from ${message_account}`
    )
    return
  }

  const { alias } = message_content
  if (alias) {
    await update_account({
      account_address: message_account,
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
  } = message_content

  await update_representative_meta({
    representative_account_address: message_account,
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

const process_set_account_meta = async ({
  message_content,
  message_account
}) => {
  if (!message_content) {
    log(
      `No message content found for SET_ACCOUNT_META message from ${message_account}`
    )
    return
  }

  const { alias } = message_content
  if (alias) {
    await update_account({
      account_address: message_account,
      update: { alias }
    })
  }
}

export default async function process_community_message({
  message,
  message_account
}) {
  let message_content
  try {
    message_content = JSON.parse(message.content)
  } catch (error) {
    log(`Error parsing message content: ${error}`)
    return
  }

  if (!message_content) {
    log(
      `No message content found for ${message.operation} message from ${message_account}`
    )
    return
  }

  switch (message.operation) {
    case 'SET_ACCOUNT_META':
      return process_set_account_meta({
        message,
        message_content,
        message_account
      })

    case 'SET_REPRESENTATIVE_META':
      return process_set_representative_meta({
        message,
        message_content,
        message_account
      })

    default:
      log(`Unsupported message operation: ${message.operation}`)
  }
}
