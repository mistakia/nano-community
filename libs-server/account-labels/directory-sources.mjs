import { is_nano_address_valid } from '#common'
import { is_valid_tag } from './resolve-account-labels.mjs'

const normalize_address = (address) =>
  typeof address === 'string' ? address.replace(/^xrb_/, 'nano_') : address

const expect_array = ({ value, source }) => {
  if (!Array.isArray(value)) {
    throw new Error(`${source}: expected an array, got ${typeof value}`)
  }
  return value
}

// nano.to/known: [{ name, address, expires_unix, ... }]
export const parse_nano_to = (raw) =>
  expect_array({ value: raw, source: 'nano.to' })
    .filter((entry) => entry && typeof entry.name === 'string' && entry.name)
    .map((entry) => ({
      account: normalize_address(entry.address),
      label_type: 'alias',
      value: entry.name.trim().slice(0, 255),
      expires_at: Number.isFinite(entry.expires_unix)
        ? entry.expires_unix
        : null
    }))

const NANOLOOKER_TAGS = {
  GENESIS_ACCOUNT: 'type/genesis',
  BURN_ACCOUNT: 'type/burn',
  ORIGINAL_DEVELOPER_FUND_ACCOUNT: 'type/developer_fund',
  KNOWN_EXCHANGE_ACCOUNTS: 'type/exchange',
  DEVELOPER_FUND_ACCOUNTS: 'type/developer_fund',
  BITGRAIL_TRUSTEE_ACCOUNTS: 'type/bitgrail_trustee'
}

// nanolooker knownAccounts.json: { CATEGORY: address | [address] }
export const parse_nanolooker = (raw) => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('nanolooker: expected an object of categories')
  }
  const claims = []
  for (const [category, tag] of Object.entries(NANOLOOKER_TAGS)) {
    const value = raw[category]
    const addresses = Array.isArray(value) ? value : value ? [value] : []
    for (const address of addresses) {
      claims.push({
        account: normalize_address(address),
        label_type: 'tag',
        value: tag,
        expires_at: null
      })
    }
  }
  return claims
}

// Drops claims with an invalid address or a tag outside the vocabulary
export const is_valid_claim = (claim) =>
  is_nano_address_valid(claim.account) &&
  (claim.label_type === 'alias' ||
    (claim.label_type === 'tag' && is_valid_tag(claim.value)))

// Directories whose full claim set is fetched on each sync. A claim a
// directory no longer lists is removed after a successful fetch.
export const DIRECTORY_SOURCES = [
  {
    source: 'nano.to',
    url: 'https://api.nano.to/known',
    parse: parse_nano_to
  },
  {
    source: 'nanolooker',
    url: 'https://raw.githubusercontent.com/running-coder/nanolooker/master/src/knownAccounts.json',
    parse: parse_nanolooker
  }
]
