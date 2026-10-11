import { COMMUNITY_WINDOW_SECONDS } from './verify-community-request.mjs'

// The account a key acted for when it signed: a link in force at issued_at,
// otherwise the account the message names. A link counts from
// COMMUNITY_WINDOW_SECONDS before its server-time created_at, since issued_at
// is signer time.
export default async function resolve_signer_account({
  connection,
  public_key,
  issued_at,
  account
}) {
  const link = await connection('account_keys')
    .select('account')
    .where({ public_key })
    .where('created_at', '<=', issued_at + COMMUNITY_WINDOW_SECONDS)
    .where((query) =>
      query.whereNull('revoked_at').orWhere('revoked_at', '>', issued_at)
    )
    .first()
  return link ? link.account : account
}
