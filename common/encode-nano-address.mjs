import ed25519 from '@trashman/ed25519-blake2b'

import { encode_nano_base32 } from './nano-base-32.mjs'

export default function encode_nano_address({
  public_key_buf,
  prefix = 'nano_'
}) {
  const encoded_public_key = encode_nano_base32(public_key_buf)
  const checksum = ed25519.hash(public_key_buf, 5).reverse()
  const encoded_checksum = encode_nano_base32(checksum)
  return prefix + encoded_public_key + encoded_checksum
}
