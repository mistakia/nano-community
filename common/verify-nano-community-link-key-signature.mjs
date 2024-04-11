import ed25519 from '@trashman/ed25519-blake2b'

export default function verify_nano_community_link_key_signature({
  linked_public_key,
  nano_account,
  nano_account_public_key,
  signature
}) {
  const data = Buffer.from(['LINK', nano_account, linked_public_key])

  const message_hash = ed25519.hash(data)
  return ed25519.verify(signature, message_hash, nano_account_public_key)
}
