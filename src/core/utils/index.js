export { mergeList } from './merge-list'
export { localStorageAdapter } from './local-storage'
export { timeago } from './timeago'
export { debounce } from './debounce'
export { fuzzySearch } from './fuzzy-search'

/* eslint-disable no-extra-semi */
export const groupBy = (xs, key) =>
  xs.reduce((rv, x) => {
    ;(rv[x[key]] = rv[x[key]] || []).push(x)
    return rv
  }, {})
/* eslint-enable no-extra-semi */
