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

// The two wire units POST /api/auth/register/key takes
export const sign_link_request = ({ account_key, linked_key, ...rest }) => ({
  link: sign_community_request({
    key: account_key,
    action: 'link_key',
    parameters: { linked_public_key: linked_key.public_key },
    ...rest
  }),
  accept: sign_community_request({
    key: linked_key,
    action: 'accept_link',
    parameters: { linked_account: account_key.account },
    ...rest
  })
})
