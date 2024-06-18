/* global IS_DEV */
import BigNumber from 'bignumber.js'

//= ====================================
//  GENERAL
// -------------------------------------
export const BASE_URL = IS_DEV
  ? 'http://localhost:8080'
  : 'https://nano.community'
export const API_URL = `${BASE_URL}/api`
export const WS_URL = IS_DEV ? 'ws://localhost:8080' : 'wss://nano.community'

// 3 Million Nano (3e36)
export const REP_MAX_WEIGHT = BigNumber(3).shiftedBy(36)

export const base_ranges = [
  '_1000000',
  '_100000',
  '_10000',
  '_1000',
  '_100',
  '_10',
  '_1',
  '_01',
  '_001',
  '_0001',
  '_00001',
  '_000001',
  '_000001_below'
]

export const base_range_labels = {
  _1000000: '>1M',
  _100000: '100k to 1M',
  _10000: '10k to 100k',
  _1000: '1k to 10k',
  _100: '100 to 1k',
  _10: '10 to 100',
  _1: '1 to 10',
  _01: '0.1 to 1',
  _001: '0.01 to 0.1',
  _0001: '0.001 to 0.01',
  _00001: '0.0001 to 0.001',
  _000001: '0.00001 to 0.0001',
  _000001_below: '<0.00001'
}

export const base_range_and_above_labels = {
  _1000000: '1M and above',
  _100000: '100k and above',
  _10000: '10k and above',
  _1000: '1k and above',
  _100: '100 and above',
  _10: '10 and above',
  _1: '1 and above',
  _01: '0.1 and above',
  _001: '0.01 and above',
  _0001: '0.001 and above',
  _00001: '0.0001 and above'
}
