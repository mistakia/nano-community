import {
  verify_signed_message,
  NanoSignedMessageError,
  ERROR_CODES
} from 'nano-signed-message'

export const COMMUNITY_DOMAIN = 'nano.community'
export const COMMUNITY_WINDOW_SECONDS = 600
// The specification's recommended cap, enough for every registered profile.
// Without it the JSON body parser's 100 KB default was the only bound.
export const MAX_MESSAGE_BYTES = 64 * 1024

export class CommunityRequestError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

const PUBLIC_KEY_RE = /^[0-9a-f]{64}$/
const BLOCK_HASH_RE = /^[0-9a-f]{64}$/

export const is_public_key = (value) =>
  typeof value === 'string' && PUBLIC_KEY_RE.test(value)

export const is_block_hash = (value) =>
  typeof value === 'string' && BLOCK_HASH_RE.test(value)

export const is_plain_object = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value)

// Verifies a {message, signature} wire unit under the nano.community profile:
// the canonical format, one of the allowed actions, a nonce, and issued_at
// within ten minutes of server time in either direction.
export default function verify_community_request({
  wire_unit,
  actions,
  now = Math.floor(Date.now() / 1000)
}) {
  if (!is_plain_object(wire_unit)) {
    throw new CommunityRequestError(400, 'expected a {message, signature} unit')
  }
  if (
    typeof wire_unit.message === 'string' &&
    Buffer.byteLength(wire_unit.message, 'utf8') > MAX_MESSAGE_BYTES
  ) {
    throw new CommunityRequestError(
      400,
      `message exceeds ${MAX_MESSAGE_BYTES} bytes`
    )
  }

  let result
  try {
    result = verify_signed_message({
      message: wire_unit.message,
      signature: wire_unit.signature,
      domain: COMMUNITY_DOMAIN,
      actions,
      now
    })
  } catch (error) {
    if (error instanceof NanoSignedMessageError) {
      const status = error.code === ERROR_CODES.INVALID_SIGNATURE ? 401 : 400
      throw new CommunityRequestError(status, error.message)
    }
    throw error
  }

  const { payload } = result
  if (payload.nonce === undefined) {
    throw new CommunityRequestError(400, 'nonce is required')
  }
  if (Math.abs(now - payload.issued_at) > COMMUNITY_WINDOW_SECONDS) {
    throw new CommunityRequestError(
      400,
      'issued_at is outside the allowed window'
    )
  }

  return result
}

export const send_request_error = ({ res, error }) =>
  res.status(error.status).send({ error: error.message })

export function expect_parameter_keys({ parameters, keys }) {
  const present = Object.keys(parameters)
  if (
    present.length !== keys.length ||
    !keys.every((key) => present.includes(key))
  ) {
    throw new CommunityRequestError(
      400,
      `parameters must hold exactly ${keys.join(', ')}`
    )
  }
}
