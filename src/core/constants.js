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
