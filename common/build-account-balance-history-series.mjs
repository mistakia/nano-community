import BigNumber from 'bignumber.js'

export const MILLISECONDS_PER_DAY = 86400000

const to_nano = (raw_balance) => new BigNumber(raw_balance).shiftedBy(-30)

// balance_history: one { date_unix, date, balance } row per UTC day with a
// block, ascending. price_history: daily { timestamp_utc, price } rows keyed at
// UTC midnight. Every series continues to the UTC day of `now`; the USD series
// end at the latest priced day, since today's price is imported tomorrow.
export function build_account_balance_history_series({
  balance_history,
  price_history,
  now
}) {
  const balance_series = balance_history.map((entry) => [
    entry.date,
    to_nano(entry.balance).toNumber()
  ])
  const usd_value_series = []
  const usd_price_series = []

  if (balance_history.length === 0) {
    return { balance_series, usd_value_series, usd_price_series }
  }

  const present_day_timestamp =
    Math.floor(now.getTime() / MILLISECONDS_PER_DAY) * MILLISECONDS_PER_DAY
  const last_entry = balance_history[balance_history.length - 1]
  if (last_entry.date_unix * 1000 < present_day_timestamp) {
    balance_series.push([
      new Date(present_day_timestamp).toISOString(),
      to_nano(last_entry.balance).toNumber()
    ])
  }

  const price_by_day = new Map(
    price_history.map((entry) => [entry.timestamp_utc, entry.price])
  )

  // index of the latest balance row on or before the current day
  let balance_index = -1
  for (
    let day_timestamp = balance_history[0].date_unix * 1000;
    day_timestamp <= present_day_timestamp;
    day_timestamp += MILLISECONDS_PER_DAY
  ) {
    while (
      balance_index + 1 < balance_history.length &&
      balance_history[balance_index + 1].date_unix * 1000 <= day_timestamp
    ) {
      balance_index += 1
    }

    const day_iso = new Date(day_timestamp).toISOString()
    const price = price_by_day.get(day_iso)
    if (!price) {
      continue
    }

    const date = day_iso.split('T')[0]
    const balance = to_nano(balance_history[balance_index].balance)
    usd_value_series.push([date, balance.multipliedBy(price).toFixed(2)])
    usd_price_series.push([date, new BigNumber(price).toFixed(2)])
  }

  return { balance_series, usd_value_series, usd_price_series }
}
