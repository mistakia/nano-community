import ed25519 from '@trashman/ed25519-blake2b'

export default function sign_nano_community_link_key({
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
