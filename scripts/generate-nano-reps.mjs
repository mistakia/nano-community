import debug from 'debug'
// import yargs from 'yargs'
// import { hideBin } from 'yargs/helpers'
import diff from 'deep-diff'
import fetch from 'node-fetch'
import { pipeline } from 'stream'
import { promisify } from 'util'
import os from 'os'
import fs from 'fs'
import { fileURLToPath } from 'url'
import path, { dirname } from 'path'

/* eslint-disable no-unused-vars */
import db from '#db'
import { isMain, read_csv, convertToCSV } from '#common'
/* eslint-enable no-unused-vars */

// const argv = yargs(hideBin(process.argv)).argv
const log = debug('generate-nano-reps')
debug.enable('generate-nano-reps')

const generate_nano_reps = async () => {
  // Fetch nano representatives data from GitHub and save to temp file
  const current_date = new Date().toISOString().split('T')[0]
  const filename = `nano-reps-${current_date}.csv`
  const csv_download_path = `${os.tmpdir()}/${filename}`
  const stream_pipeline = promisify(pipeline)
  const nano_reps_resp = await fetch(
    'https://raw.githubusercontent.com/mistakia/nano-community/main/data/nano-reps.csv'
  )
  await stream_pipeline(
    nano_reps_resp.body,
    fs.createWriteStream(`${csv_download_path}`)
  )
  // Read the downloaded CSV data
  const csv_reps = await read_csv(csv_download_path, {
    mapValues: ({ header, index, value }) => (value === '' ? null : value)
  })

  // Fetch representatives data from the database
  const db_reps = await db('representatives_meta_index')
    .leftJoin(
      'accounts',
      'representatives_meta_index.account',
      'accounts.account'
    )
    .leftJoin(
      'accounts_meta_index',
      'accounts.account',
      'accounts_meta_index.account'
    )
    .select(
      'accounts.alias',
      'accounts_meta_index.weight',
      'representatives_meta_index.account',
      'reddit',
      'discord',
      'twitter',
      'github',
      'website',
      'email'
    )

  const results_index = {}

  // Index database representatives by account
  const db_reps_index = db_reps.reduce((acc, cur) => {
    acc[cur.account] = cur
    return acc
  }, {})

  // Index CSV representatives by account
  const csv_reps_index = csv_reps.reduce((acc, cur) => {
    acc[cur.account] = cur
    return acc
  }, {})

  // Merge csv and database data, skip accounts with conflicts
  for (const account in csv_reps_index) {
    const nano_rep = csv_reps_index[account]
    const db_rep = db_reps_index[account]
    const db_rep_without_weight_field = { ...db_rep }
    delete db_rep_without_weight_field.weight
    const differences = diff(nano_rep, db_rep_without_weight_field)

    // Filter for conflicting edits
    const edits = differences.filter((diff) => diff.kind === 'E')
    const conflicting_edits = edits.filter(
      (edit) => Boolean(edit.lhs) && Boolean(edit.rhs)
    )

    if (conflicting_edits.length) {
      log(`conflicting edits for account: ${account}`)
      log(conflicting_edits)
      continue
    }

    // Merge values, preferring truthy values
    const merged_rep = { ...db_rep_without_weight_field, ...nano_rep }
    for (const key in merged_rep) {
      if (merged_rep[key] === null) {
        merged_rep[key] = nano_rep[key] || db_rep_without_weight_field[key]
      }
    }

    results_index[account] = merged_rep
  }

  // Add missing representatives with sufficient voting weight
  for (const account in db_reps_index) {
    if (
      !results_index[account] &&
      db_reps_index[account].weight > 1000000000000000000000000000000000
    ) {
      const { weight, ...db_rep_without_weight_field } = db_reps_index[account]
      results_index[account] = db_rep_without_weight_field
    }
  }

  // Sort results by alias
  const results = Object.values(results_index).sort((a, b) => {
    const alias_a = a.alias || ''
    const alias_b = b.alias || ''
    return alias_a.localeCompare(alias_b)
  })

  // Convert results to CSV and save
  const csv_headers = {}
  for (const field of Object.keys(results[0])) {
    csv_headers[field] = field
  }
  const result_csv_data = [csv_headers, ...results]
  const result_csv_string = JSON.stringify(result_csv_data)
  const result_csv = convertToCSV(result_csv_string)
  const __dirname = dirname(fileURLToPath(import.meta.url))
  const data_path = path.join(__dirname, '../data')
  const csv_path = path.join(data_path, 'nano-reps.csv')
  await fs.promises.writeFile(csv_path, result_csv)

  log(`wrote ${results.length} reps to ${csv_path}`)
}

const main = async () => {
  let error
  try {
    await generate_nano_reps()
  } catch (err) {
    error = err
    log(error)
  }

  // await db('jobs').insert({
  //   type: constants.jobs.EXAMPLE,
  //   succ: error ? 0 : 1,
  //   reason: error ? error.message : null,
  //   timestamp: Math.round(Date.now() / 1000)
  // })

  process.exit()
}

if (isMain(import.meta.url)) {
  main()
}

export default generate_nano_reps
