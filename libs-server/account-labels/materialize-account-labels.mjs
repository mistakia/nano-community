import db from '#db'
import resolve_account_labels from './resolve-account-labels.mjs'
import load_signed_message_claims from './load-signed-message-claims.mjs'

// Resolves an account's claims and writes the result to accounts.alias and
// accounts_tags, the only writer of either. An alias change is logged in
// accounts_changelog when it replaces an earlier value.
export default async function materialize_account_labels({
  account,
  connection = db,
  now = Math.floor(Date.now() / 1000)
}) {
  const stored_claims = await connection('account_labels')
    .select(
      'account',
      'source',
      'label_type',
      'value',
      'observed_at',
      'expires_at'
    )
    .where({ account })
  const signed_claims = await load_signed_message_claims({
    account,
    connection
  })
  const { alias, tags } = resolve_account_labels({
    claims: [...stored_claims, ...signed_claims],
    now
  })

  const row = await connection('accounts').where({ account }).first()
  const previous_alias = row ? row.alias : null
  const alias_changed = alias !== previous_alias
  if (alias_changed) {
    if (row) {
      await connection('accounts').update({ alias }).where({ account })
    } else {
      await connection('accounts').insert({ account, alias })
    }
    if (previous_alias) {
      await connection('accounts_changelog')
        .insert({
          account,
          column: 'alias',
          previous_value: previous_alias,
          new_value: alias || '',
          timestamp: now
        })
        .onConflict([
          'account',
          'column',
          'previous_value',
          'new_value',
          'timestamp'
        ])
        .ignore()
    }
  }

  const previous_tags = (
    await connection('accounts_tags').select('tag').where({ account })
  ).map((r) => r.tag)
  const removed = previous_tags.filter((tag) => !tags.includes(tag))
  const added = tags.filter((tag) => !previous_tags.includes(tag))
  if (removed.length) {
    await connection('accounts_tags')
      .where({ account })
      .whereIn('tag', removed)
      .del()
  }
  if (added.length) {
    await connection('accounts_tags')
      .insert(added.map((tag) => ({ account, tag })))
      .onConflict(['account', 'tag'])
      .ignore()
  }

  return { alias, tags, alias_changed }
}
