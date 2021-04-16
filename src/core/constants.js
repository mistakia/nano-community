/* global IS_DEV */

//= ====================================
//  GENERAL
// -------------------------------------
export const BASE_URL = IS_DEV
  ? 'http://localhost:8089/api'
  : 'https://nano.community/api'
export const WS_URL = IS_DEV ? 'ws://localhost:8089' : 'wss://nano.community'
