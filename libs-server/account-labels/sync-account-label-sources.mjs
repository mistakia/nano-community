import debug from 'debug'

import db from '#db'
import { request } from '#common'
import { DIRECTORY_SOURCES, is_valid_claim } from './directory-sources.mjs'
import materialize_account_labels from './materialize-account-labels.mjs'

const log = debug('sync-account-label-sources')

const BATCH_SIZE = 500

const sync_source = async ({ source, url, parse, fetch_json, now }) => {
  const raw = await fetch_json(url)
  const parsed = parse(raw)
  const claims = parsed.filter(is_valid_claim)
  // An empty result is treated as a broken fetch, so it cannot sweep every claim
  if (!claims.length) {
    throw new Error(`${source}: no valid claims in ${parsed.length} entries`)
  }

  const rows = claims.map((claim) => ({ ...claim, source, observed_at: now }))
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    await db('account_labels')
      .insert(rows.slice(i, i + BATCH_SIZE))
      .onConflict(['account', 'source', 'label_type', 'value'])
      .merge(['observed_at', 'expires_at'])
  }

  const swept = await db('account_labels')
    .where({ source })
    .where('observed_at', '<', now)
    .del()
    .returning(['account'])

  const touched = new Set([
    ...claims.map((claim) => claim.account),
    ...swept.map((row) => row.account)
  ])
  let alias_changes = 0
  for (const account of touched) {
    const { alias_changed } = await materialize_account_labels({ account, now })
    if (alias_changed) alias_changes += 1
  }

  return {
    source,
    ok: true,
    claims: claims.length,
    rejected: parsed.length - claims.length,
    swept: swept.length,
    alias_changes
  }
}

// Fetches every directory source, upserts its claims, removes the claims it
// no longer lists and re-resolves the accounts it touched. A source that fails
// keeps its earlier claims and is reported with ok: false.
export default async function sync_account_label_sources({
  sources = DIRECTORY_SOURCES,
  fetch_json = (url) => request({ url }),
  now = Math.floor(Date.now() / 1000)
} = {}) {
  const results = []
  for (const { source, url, parse } of sources) {
    try {
      const result = await sync_source({ source, url, parse, fetch_json, now })
      log(result)
      results.push(result)
    } catch (error) {
      log(`${source} failed: ${error.message}`)
      results.push({ source, ok: false, error: error.message })
    }
  }
  return results
}
