export const discordNano = '370266023905198083'
export const discordNanoTrade = '403628195548495882'
export const repo = 'mistakia/nano-community'
export const BURN_ACCOUNT =
  'nano_1111111111111111111111111111111111111111111111111111hifc8npp'
export const REPRESENTATIVE_TRACKING_MINIMUM_VOTING_WEIGHT =
  10000000000000000000000000000000000n
export const ACCOUNT_TRACKING_MINIMUM_BALANCE = 100000000000000000000000000000n

// Account tags: the discussion #100 taxonomy, plus the nanolooker categories
export const ACCOUNT_TAG_VOCABULARY = [
  'type/faucet',
  'type/exchange',
  'type/spam',
  'type/deposit',
  'type/withdrawal',
  'type/payment',
  'type/donation',
  'type/burn',
  'type/custodial',
  'type/genesis',
  'type/developer_fund',
  'type/bitgrail_trustee',
  'exchange/deposit',
  'exchange/withdrawal'
]

// Trust of each label source; the highest-trust unexpired alias claim wins.
// A claim from a source not listed here is ignored.
export const ACCOUNT_LABEL_SOURCE_TRUST = {
  'signed-message': 100,
  admin: 90,
  'nano.to': 50,
  nanolooker: 40,
  'graham-tipbot': 20,
  nanotipbot: 10
}
