import diff from 'deep-diff'
import debug from 'debug'

import db from '#db'

const log = debug('update-account')

const nullable_columns = []
const excluded_columns = []
const editable_columns = ['alias', 'monitor_url', 'watt_hour']

export default async function update_account({
  account_row,
  account_address,
  update
}) {
  if (!update) {
    return 0
  }

  if (
    !account_row &&
    (typeof account_address === 'string' || account_address instanceof String)
  ) {
    account_row = await db('accounts')
      .where({ account: account_address })
      .first()

    // If account_row is still not found, create a new one
    if (!account_row) {
      await db('accounts').insert({
        account: account_address
      })
      account_row = await db('accounts')
        .where({ account: account_address })
        .first()
    }
  }

  if (!account_row) {
    return 0
  }

  if (!account_row.account) {
    throw new Error('Account is missing account address')
  }

  const formatted_update = {
    ...update,
    account: account_row.account
  }

  // TODO format & validate params

  const differences = diff(account_row, formatted_update)

  const edits = differences.filter((d) => d.kind === 'E')
  if (!edits.length) {
    return 0
  }

  let changes_count = 0
  for (const edit of edits) {
    const prop = edit.path[0]

    if (!editable_columns.includes(prop)) {
      continue
    }

    const is_null = !edit.rhs
    const is_nullable = nullable_columns.includes(prop)
    if (is_null && !is_nullable) {
      continue
    }

    if (excluded_columns.includes(prop)) {
      log(`not allowed to edit ${prop}`)
      continue
    }

    log(
      `updating account: ${account_row.account}, Column: ${prop}, Value: ${edit.lhs} => ${edit.rhs}`
    )

    const has_existing_value = edit.lhs
    if (has_existing_value) {
      await db('accounts_changelog')
        .insert({
          account: account_row.account,
          column: prop,
          previous_value: edit.lhs,
          new_value: edit.rhs,
          timestamp: Math.floor(Date.now() / 1000)
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

    await db('accounts')
      .update({
        [prop]: edit.rhs
      })
      .where({
        account: account_row.account
      })

    changes_count += 1
  }

  return changes_count
}
