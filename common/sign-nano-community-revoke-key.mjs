import ed25519 from '@trashman/ed25519-blake2b'

export default function sign_nano_community_revoke_key({
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
