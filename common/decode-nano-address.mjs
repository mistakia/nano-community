import { decode_nano_base32 } from './nano-base-32.mjs'
import binary_to_hex from './binary-to-hex.mjs'

export default function decode_nano_address({ address }) {
  const cleaned_address = address.replace('nano_', '').replace('xrb_', '')
  const decoded = decode_nano_base32(cleaned_address)
  const public_key = binary_to_hex(decoded.subarray(0, 32))
  const checksum = binary_to_hex(decoded.subarray(32, 32 + 5))
  return {
    public_key,
    checksum
  }
}
