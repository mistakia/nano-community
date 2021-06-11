import * as timeago from 'timeago.js'

const locale = function (number, index, totalSec) {
  return [
    ['just now', 'right now'],
    ['%ss', 'in %ss'],
    ['1m', 'in 1m'],
    ['%sm', 'in %sm'],
    ['1h', 'in 1h'],
    ['%sh', 'in %sh'],
    ['1d', 'in 1d'],
    ['%sd', 'in %sd'],
    ['1w', 'in 1w'],
    ['%sw', 'in %sw'],
    ['1M', 'in 1M'],
    ['%sM', 'in %sM'],
    ['1Y', 'in 1Y'],
    ['%sY', 'in %sY']
  ][index]
}
timeago.register('nano_short', locale)

export { timeago }
