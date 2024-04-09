import ed25519 from '@trashman/ed25519-blake2b'

export default function verify_nano_community_message_signature({
  entry_id,
  chain_id,
  entry_clock,
  chain_clock,

  public_key,
  operation,
  content,
  tags,

  references,

  created_at,

  signature
}) {
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

  return ed25519.verify(signature, message_hash, public_key)
}
