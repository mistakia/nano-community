// Epoch seconds at the edges. Instants are stored as timestamptz; the public
// API and the detector windows work in epoch seconds, so a reader converts
// with epoch_seconds_sql on the way out and a writer with to_date on the way in.

// SQL expression for a timestamptz column as integer epoch seconds.
export const epoch_seconds_sql = (column, alias) =>
  `extract(epoch from ${column})::integer${alias ? ` as "${alias}"` : ''}`

// Epoch seconds to the Date a timestamptz column takes. Null stays null.
export const seconds_to_date = (seconds) =>
  seconds === null || seconds === undefined ? null : new Date(seconds * 1000)

// A Date read from a timestamptz column to integer epoch seconds. Null stays
// null.
export const date_to_seconds = (date) =>
  date === null || date === undefined ? null : Math.floor(date.getTime() / 1000)
