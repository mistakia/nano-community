import diff from 'deep-diff'
import debug from 'debug'

import db from '#db'

const log = debug('update-representative-meta')

const nullable_columns = []
const excluded_columns = []
const editable_columns = [
  'alias',
  'description',
  'donation_address',
  'cpu_model',
  'cpu_cores',
  'ram',
  'reddit',
  'twitter',
  'discord',
  'github',
  'email',
  'website'
]

export default async function update_representative_meta({
  representative_row,
  representative_account_address,
  update
}) {
  if (!update) {
    return 0
  }

  if (
    !representative_row &&
    (typeof representative_account_address === 'string' ||
      representative_account_address instanceof String)
  ) {
    representative_row = await db('representatives_meta_index')
      .where({ account: representative_account_address })
      .first()

    // If representative_row is still not found, create a new one
    if (!representative_row) {
      await db('representatives_meta_index').insert({
        account: representative_account_address,
        timestamp: Math.floor(Date.now() / 1000)
      })
      representative_row = await db('representatives_meta_index')
        .where({ account: representative_account_address })
        .first()
    }
  }

  if (!representative_row) {
    return 0
  }

  if (!representative_row.account) {
    throw new Error('Representative is missing account address')
  }

  const formatted_update = {
    ...update,
    account: representative_row.account
  }

  const differences = diff(representative_row, formatted_update)

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
      `updating representative: ${representative_row.account}, Column: ${prop}, Value: ${edit.lhs} => ${edit.rhs}`
    )

    const has_existing_value = edit.lhs
    if (has_existing_value) {
      await db('representatives_meta_index_changelog')
        .insert({
          account: representative_row.account,
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

    await db('representatives_meta_index')
      .update({
        [prop]: edit.rhs
      })
      .where({
        account: representative_row.account
      })

    changes_count += 1
  }

  return changes_count
}
