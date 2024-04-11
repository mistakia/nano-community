import ed25519 from '@trashman/ed25519-blake2b'

export default function verify_nano_community_revoke_key_signature({
  linked_public_key,
  nano_account,
  nano_account_public_key,
  signature
}) {
  if (!linked_public_key) {
    throw new Error('linked_public_key is required')
  }

  if (!nano_account) {
    throw new Error('nano_account is required')
  }

  if (!nano_account_public_key) {
    throw new Error('nano_account_public_key is required')
  }

  if (!signature) {
    throw new Error('signature is required')
  }

  const data = Buffer.from(['REVOKE', nano_account, linked_public_key])

  const message_hash = ed25519.hash(data)
  return ed25519.verify(signature, message_hash, nano_account_public_key)
}
