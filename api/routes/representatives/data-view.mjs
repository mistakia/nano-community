import express from 'express'
import BigNumber from 'bignumber.js'

import cache from '#api/cache.mjs'
import {
  get_representative_value,
  REPRESENTATIVE_COLUMN_IDS,
  REPRESENTATIVE_COLUMN_DATA_TYPES
} from '#common/representative-table-columns.mjs'

const router = express.Router()

const FILTER_OPERATORS = {
  '=': (value, filter_value) => value === filter_value,
  '!=': (value, filter_value) => value !== filter_value,
  '>': (value, filter_value) => Number(value) > Number(filter_value),
  '>=': (value, filter_value) => Number(value) >= Number(filter_value),
  '<': (value, filter_value) => Number(value) < Number(filter_value),
  '<=': (value, filter_value) => Number(value) <= Number(filter_value),
  LIKE: (value, filter_value) =>
    String(value).toLowerCase().includes(String(filter_value).toLowerCase()),
  'NOT LIKE': (value, filter_value) =>
    !String(value).toLowerCase().includes(String(filter_value).toLowerCase()),
  IN: (value, filter_value) =>
    Array.isArray(filter_value) && filter_value.includes(value),
  'NOT IN': (value, filter_value) =>
    Array.isArray(filter_value) && !filter_value.includes(value),
  'IS NULL': (value) => value === null || value === undefined,
  'IS NOT NULL': (value) => value !== null && value !== undefined
}

// react-table TABLE_DATA_TYPES values
const DATA_TYPES = {
  NUMBER: 1,
  TEXT: 2,
  DATE: 5
}

function compare_values(a_value, b_value, data_type) {
  // Always sort nulls to the end regardless of sort direction
  if (a_value == null && b_value == null) return 0
  if (a_value == null) return 1
  if (b_value == null) return -1

  if (data_type === DATA_TYPES.NUMBER) {
    return Number(a_value) - Number(b_value)
  }

  if (data_type === DATA_TYPES.DATE) {
    return new Date(a_value) - new Date(b_value)
  }

  if (data_type === DATA_TYPES.TEXT) {
    return String(a_value).localeCompare(String(b_value))
  }

  if (typeof a_value === 'number' && typeof b_value === 'number') {
    return a_value - b_value
  }

  return String(a_value).localeCompare(String(b_value))
}

function apply_filters(data, where_filters) {
  if (!where_filters || where_filters.length === 0) {
    return data
  }

  return data.filter((row) =>
    where_filters.every((filter) => {
      const { column_id, operator, value } = filter
      const row_value = get_representative_value(row, column_id)
      const filter_fn = FILTER_OPERATORS[operator]
      if (!filter_fn) {
        throw new Error(`Invalid filter operator: ${operator}`)
      }
      return filter_fn(row_value, value)
    })
  )
}

function apply_sorting(data, sort_config) {
  if (!sort_config || sort_config.length === 0) {
    return data
  }

  return [...data].sort((a, b) => {
    for (const { column_id, desc } of sort_config) {
      const a_value = get_representative_value(a, column_id)
      const b_value = get_representative_value(b, column_id)

      // Null handling: always push nulls to end
      if (a_value == null && b_value == null) continue
      if (a_value == null) return 1
      if (b_value == null) return -1

      const data_type = REPRESENTATIVE_COLUMN_DATA_TYPES[column_id]
      const result = compare_values(a_value, b_value, data_type)
      if (result !== 0) {
        return desc ? -result : result
      }
    }
    return 0
  })
}

/**
 * Construct version string from telemetry data
 */
function get_version_string(rep) {
  const t = rep.telemetry
  if (!t || t.major_version == null) return null
  return `${t.major_version}.${t.minor_version}.${t.patch_version}`
}

function format_big_number(value) {
  if (value == null) return null
  return BigNumber(value).toFormat()
}

/**
 * Flatten a representative row into a flat object keyed by column IDs.
 * Display values are pre-formatted for direct rendering.
 */
function flatten_representative(rep) {
  const flat = {}
  for (const column_id of Object.values(REPRESENTATIVE_COLUMN_IDS)) {
    if (column_id === REPRESENTATIVE_COLUMN_IDS.VERSION) {
      flat[column_id] = get_version_string(rep)
    } else {
      flat[column_id] = get_representative_value(rep, column_id)
    }
  }

  // Format display values for number columns
  const weight = flat[REPRESENTATIVE_COLUMN_IDS.WEIGHT]
  if (weight != null) {
    flat[REPRESENTATIVE_COLUMN_IDS.WEIGHT] = BigNumber(weight).shiftedBy(-30).toFormat(0)
  }

  const weight_pct = flat[REPRESENTATIVE_COLUMN_IDS.WEIGHT_PCT]
  if (weight_pct != null) {
    flat[REPRESENTATIVE_COLUMN_IDS.WEIGHT_PCT] = `${Number(weight_pct).toFixed(2)}%`
  }

  for (const col of [
    REPRESENTATIVE_COLUMN_IDS.CONFS_BEHIND,
    REPRESENTATIVE_COLUMN_IDS.BLOCKS_BEHIND,
    REPRESENTATIVE_COLUMN_IDS.CEMENTED_COUNT,
    REPRESENTATIVE_COLUMN_IDS.BLOCK_COUNT,
    REPRESENTATIVE_COLUMN_IDS.UNCHECKED_COUNT
  ]) {
    flat[col] = format_big_number(flat[col])
  }

  const bw = flat[REPRESENTATIVE_COLUMN_IDS.BANDWIDTH_CAP]
  if (bw === 0) {
    flat[REPRESENTATIVE_COLUMN_IDS.BANDWIDTH_CAP] = 'Unlimited'
  } else if (bw != null) {
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
    const i = parseInt(Math.floor(Math.log(bw) / Math.log(1024)), 10)
    if (i === 0) {
      flat[REPRESENTATIVE_COLUMN_IDS.BANDWIDTH_CAP] = `${bw} ${sizes[i]}/s`
    } else {
      flat[REPRESENTATIVE_COLUMN_IDS.BANDWIDTH_CAP] = `${(bw / 1024 ** i).toFixed(1)} ${sizes[i]}/s`
    }
  }

  // Include uptime array for the Uptime cell renderer (prefixed to avoid
  // overwriting the computed numeric 'uptime' column value)
  flat._uptime_data = rep.uptime || []
  // Include is_online for the LastSeen cell renderer
  flat._is_online = rep.is_online || (rep.last_online > (rep.last_offline || 0))
  return flat
}

router.post('/', async (req, res) => {
  const { logger } = req.app.locals
  try {
    const { table_state = {} } = req.body
    const { where, sort, offset = 0, limit = 1000 } = table_state

    let representatives = cache.get('representatives')
    if (!representatives) {
      const { loadRepresentatives } = await import('./index.mjs')
      representatives = await loadRepresentatives()
    }

    // Compute total_weight for weight percentage calculation
    let total_weight = BigNumber(0)
    for (const rep of representatives) {
      if (rep.account_meta && rep.account_meta.weight) {
        total_weight = total_weight.plus(rep.account_meta.weight)
      }
    }

    // Get quorum_total from weight cache if available
    const weight_data = cache.get('weight')
    let quorum_total = null
    if (weight_data) {
      const online = weight_data.onlineWeight ? weight_data.onlineWeight.median : 0
      const trended = weight_data.trendedWeight ? weight_data.trendedWeight.median : 0
      quorum_total = BigNumber.max(online, trended).toNumber()
    }

    const denominator = quorum_total ? BigNumber(quorum_total) : total_weight

    // Pre-compute weight_pct, version, and is_online on a shallow copy to avoid mutating cache.
    // is_online must be computed here (before apply_filters) so that status filters work.
    const reps_with_computed = representatives.map((rep) => {
      const weight_pct =
        rep.account_meta && rep.account_meta.weight && denominator.gt(0)
          ? BigNumber(rep.account_meta.weight)
              .dividedBy(denominator)
              .multipliedBy(100)
              .toNumber()
          : null
      const is_online =
        rep.is_online || (rep.last_online > (rep.last_offline || 0))
      return {
        ...rep,
        weight_pct,
        version: get_version_string(rep),
        is_online
      }
    })

    let result = reps_with_computed
    result = apply_filters(result, where)
    result = apply_sorting(result, sort)

    const total_count = result.length
    const paginated = result.slice(offset, offset + limit)

    // Flatten each row to column-keyed values for react-table
    const flat_data = paginated.map(flatten_representative)

    res.status(200).send({
      data: flat_data,
      metadata: {
        total_count,
        total_weight: total_weight.toString(),
        quorum_total
      },
      offset,
      limit,
      has_more: offset + limit < total_count
    })
  } catch (error) {
    logger(error)
    res.status(500).send({ error: error.toString() })
  }
})

export default router
