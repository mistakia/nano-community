import ed25519 from '@trashman/ed25519-blake2b'

import decode_nano_address from './decode-nano-address.mjs'

const NANO_ADDRESS_RE = /^(xrb_|nano_)[13][13-9a-km-uw-z]{59}$/

const compare_arrays = (a, b) => {
  if (a.length !== b.length) {
    return false
  }

  return a.every((byte, index) => byte === b[index])
}

export default function is_nano_address_valid(address) {
  if (typeof address !== 'string') {
    return false
  }

  if (!NANO_ADDRESS_RE.test(address)) {
    return false
  }

  const { public_key, checksum } = decode_nano_address({ address })

  const public_key_bytes = Buffer.from(public_key, 'hex')
  const checksum_bytes = Buffer.from(checksum, 'hex')
  const computed_checksum_bytes = ed25519.hash(public_key_bytes, 5).reverse()
  const valid = compare_arrays(checksum_bytes, computed_checksum_bytes)

  return valid
}
