// NIP-13 proof of work, read without hashing so the relay can load it with no
// dependencies. The event id must already be verified as the event's hash.
// Rules: docs/design/task-board-protocol.md § Proof of work.

const leading_zero_bits = (hex) => {
  let count = 0
  for (const char of hex) {
    const nibble = parseInt(char, 16)
    if (nibble === 0) {
      count += 4
      continue
    }
    return count + Math.clz32(nibble) - 28
  }
  return count
}

// The event's proof of work in bits: the id's leading zero bits, capped at the
// difficulty its nonce tag commits to, so a lucky hash mined for a lower
// target does not count for more. An event without a committed nonce has 0.
export function get_event_pow(event) {
  const nonce = (event.tags || []).find((tag) => tag[0] === 'nonce')
  const committed =
    nonce && /^[0-9]+$/.test(nonce[2] || '') ? Number(nonce[2]) : 0
  if (!committed || !/^[0-9a-f]{64}$/.test(event.id || '')) return 0
  return Math.min(leading_zero_bits(event.id), committed)
}
