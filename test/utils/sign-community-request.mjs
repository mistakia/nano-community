import crypto from 'crypto'
import {
  encode_nano_account,
  get_public_key,
  sign_message
} from 'nano-signed-message'

export const now_seconds = () => Math.floor(Date.now() / 1000)

export function create_test_key() {
  const private_key = crypto.randomBytes(32)
  const public_key = Buffer.from(get_public_key(private_key)).toString('hex')
  return {
    private_key: private_key.toString('hex'),
    public_key,
    account: encode_nano_account(public_key)
  }
}

// Signs a nano.community wire unit with a fresh nonce
export function sign_community_request({
  key,
  action,
  parameters,
  issued_at = now_seconds(),
  nonce = crypto.randomBytes(16).toString('hex'),
  domain = 'nano.community',
  mode
}) {
  return sign_message({
    private_key: key.private_key,
    mode,
    payload: {
      version: 1,
      domain,
      action,
      account: key.account,
      issued_at,
      ...(nonce !== null && { nonce }),
      parameters
    }
  })
}
