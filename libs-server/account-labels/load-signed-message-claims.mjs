import { decode_nano_address, encode_nano_address } from '#common'
import resolve_signer_account from '../resolve-signer-account.mjs'

const META_OPERATIONS = ['SET_ACCOUNT_META', 'SET_REPRESENTATIVE_META']

const parse_json = (text) => {
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

// The alias and tag claims an account made in signed meta messages, read from
// nano_community_messages. A message counts for the account it acted for: the
// named account in a version 2 message, the signing key's own account in a
// version 1 message, or the account a linked key was linked to.
export default async function load_signed_message_claims({
  account,
  connection
}) {
  const linked_keys = await connection('account_keys')
    .select('public_key')
    .where({ account })
  const public_keys = [
    decode_nano_address({ address: account }).public_key,
    ...linked_keys.map((row) => row.public_key)
  ]

  const rows = await connection('nano_community_messages')
    .select('version', 'public_key', 'content', 'message', 'created_at')
    .whereIn('operation', META_OPERATIONS)
    .whereIn('public_key', public_keys)

  const claims = []
  for (const row of rows) {
    const payload = row.version >= 2 ? parse_json(row.message) : null
    const signer_account = await resolve_signer_account({
      connection,
      public_key: row.public_key,
      issued_at: Number(row.created_at),
      account: payload
        ? payload.account
        : encode_nano_address({
            public_key_buf: Buffer.from(row.public_key, 'hex')
          })
    })
    if (signer_account !== account) continue

    const content = parse_json(row.content) || {}
    const base = {
      account,
      source: 'signed-message',
      observed_at: Number(row.created_at),
      expires_at: null
    }
    if (typeof content.alias === 'string' && content.alias) {
      claims.push({ ...base, label_type: 'alias', value: content.alias })
    }
    if (Array.isArray(content.tags)) {
      for (const tag of content.tags) {
        if (typeof tag === 'string') {
          claims.push({ ...base, label_type: 'tag', value: tag })
        }
      }
    }
  }
  return claims
}
