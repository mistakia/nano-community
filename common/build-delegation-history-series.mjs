const SECONDS_PER_DAY = 86400
const RAW_PER_NANO = 1e30

// delegation_history: { timestamp, weight, delegators } rows from
// GET /api/accounts/:address/delegation_history, one per sampled UTC day,
// ascending, with weight in raw. Returns [milliseconds, value] series covering
// every day from the first row to the last; a day with no row, or a null field,
// is a null value so the chart breaks the line there instead of joining across
// it.
export function build_delegation_history_series({ delegation_history }) {
  const weight_series = []
  const delegators_series = []

  if (delegation_history.length === 0) {
    return { weight_series, delegators_series }
  }

  const row_by_day = new Map(
    delegation_history.map((row) => [row.timestamp, row])
  )
  const first_day = delegation_history[0].timestamp
  const last_day = delegation_history[delegation_history.length - 1].timestamp

  for (let day = first_day; day <= last_day; day += SECONDS_PER_DAY) {
    const row = row_by_day.get(day)
    const milliseconds = day * 1000
    const weight = row && row.weight !== null ? row.weight / RAW_PER_NANO : null
    const delegators = row ? row.delegators : null
    weight_series.push([milliseconds, weight])
    delegators_series.push([milliseconds, delegators])
  }

  return { weight_series, delegators_series }
}
