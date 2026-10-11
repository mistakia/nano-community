import { ACCOUNT_LABEL_SOURCE_TRUST, ACCOUNT_TAG_VOCABULARY } from '#constants'

export const is_valid_tag = (value) => ACCOUNT_TAG_VOCABULARY.includes(value)

const is_live = ({ claim, now }) =>
  ACCOUNT_LABEL_SOURCE_TRUST[claim.source] !== undefined &&
  (claim.expires_at === null ||
    claim.expires_at === undefined ||
    claim.expires_at > now)

const outranks = (a, b) => {
  const trust_a = ACCOUNT_LABEL_SOURCE_TRUST[a.source]
  const trust_b = ACCOUNT_LABEL_SOURCE_TRUST[b.source]
  if (trust_a !== trust_b) return trust_a > trust_b
  return a.observed_at > b.observed_at
}

// Reduces an account's label claims to its alias and tags. Expired claims and
// claims from unknown sources are ignored. The alias is the value of the
// highest-trust claim, the newest on a tie. Tags are every valid tag claimed.
export default function resolve_account_labels({
  claims,
  now = Math.floor(Date.now() / 1000)
}) {
  let winner = null
  const tags = new Set()
  for (const claim of claims) {
    if (!is_live({ claim, now })) continue
    if (claim.label_type === 'alias') {
      if (!winner || outranks(claim, winner)) winner = claim
    } else if (claim.label_type === 'tag' && is_valid_tag(claim.value)) {
      tags.add(claim.value)
    }
  }
  return { alias: winner ? winner.value : null, tags: [...tags].sort() }
}
