import ed25519 from '@trashman/ed25519-blake2b'

export default function sign_nano_community_message(message, private_key) {
  const {
    entry_id,
    chain_id,
    entry_clock,
    chain_clock,
    public_key,
    operation,
    content,
    tags,
    references,
    created_at
  } = message

  const data = Buffer.from([
    entry_id,
    chain_id,
    entry_clock,
    chain_clock,
    public_key,
    operation,
    content,
    tags,
    references,
    created_at
  ])

  const message_hash = ed25519.hash(data)

  return ed25519.sign(message_hash, private_key, public_key)
}
