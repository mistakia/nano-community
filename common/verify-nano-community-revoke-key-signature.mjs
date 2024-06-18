import ed25519 from '@trashman/ed25519-blake2b'

export default function verify_nano_community_revoke_key_signature({
  linked_public_key,
  either_public_key,
  signature
}) {
  if (!linked_public_key) {
    throw new Error('linked_public_key is required')
  }

  if (!either_public_key) {
    throw new Error('either_public_key is required')
  }

  if (!signature) {
    throw new Error('signature is required')
  }

  const data = Buffer.from(['REVOKE', linked_public_key])

  const message_hash = ed25519.hash(data)
  return ed25519.verify(signature, message_hash, either_public_key)
}
