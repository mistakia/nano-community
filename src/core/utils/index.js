export { mergeList } from './merge-list'
export { localStorageAdapter } from './local-storage'
export { timeago } from './timeago'
export { debounce } from './debounce'
export { fuzzySearch } from './fuzzy-search'
export { download_csv } from './download-csv'
export { download_json } from './download-json'

/* eslint-disable no-extra-semi */
export const groupBy = (xs, key) =>
  xs.reduce((rv, x) => {
    ;(rv[x[key]] = rv[x[key]] || []).push(x)
    return rv
  }, {})
/* eslint-enable no-extra-semi */

export const median = (arr) => {
  const mid = Math.floor(arr.length / 2)
  const nums = [...arr].sort((a, b) => a - b)
  return arr.length % 2 !== 0 ? nums[mid] : (nums[mid - 1] + nums[mid]) / 2
}

export const average = (arr) => arr.reduce((p, c) => p + c, 0) / arr.length

export const format_value = ({ prefix = '', value }) => {
  const format_value = (number, divisor, suffix) => {
    const result = number / divisor
    return `${prefix}${result.toFixed(result % 1 !== 0 ? 1 : 0)}${suffix}`
  }
  if (value >= 1000000000) {
    return format_value(value, 1000000000, 'B')
  } else if (value >= 1000000) {
    return format_value(value, 1000000, 'M')
  } else if (value >= 1000) {
    return format_value(value, 1000, 'K')
  } else {
    return `${prefix}${value}`
  }
}
