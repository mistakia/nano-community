import express from 'express'
import BigNumber from 'bignumber.js'

import cache from '#api/cache.mjs'
import {
  get_representative_value,
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
      const data_type = REPRESENTATIVE_COLUMN_DATA_TYPES[column_id]
      const result = compare_values(a_value, b_value, data_type)
      if (result !== 0) {
        return desc ? -result : result
      }
    }
    return 0
  })
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
    // Pre-compute weight_pct on each representative
    for (const rep of representatives) {
      if (rep.account_meta && rep.account_meta.weight && denominator.gt(0)) {
        rep.weight_pct = BigNumber(rep.account_meta.weight)
          .dividedBy(denominator)
          .multipliedBy(100)
          .toNumber()
      } else {
        rep.weight_pct = null
      }
    }

    let result = representatives
    result = apply_filters(result, where)
    result = apply_sorting(result, sort)

    const total_count = result.length
    const paginated = result.slice(offset, offset + limit)

    res.status(200).send({
      data: paginated,
      total_count,
      offset,
      limit,
      has_more: offset + limit < total_count,
      metadata: {
        total_weight: total_weight.toString(),
        quorum_total
      }
    })
  } catch (error) {
    logger(error)
    res.status(500).send({ error: error.toString() })
  }
})

export default router
