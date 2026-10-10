// Unsigned event templates for the Nano community task board.
// Each returns { kind, created_at, tags, content } ready for a signer.

import {
  TASK_BOARD_KINDS,
  TASK_STATUS_KINDS,
  TASK_LABEL_VALUES,
  CLAIM_STATUSES,
  CLAIM_LIFETIME_SECONDS,
  TRIAGE_SET_D_TAG,
  KEY_RELATION_COUNTERPARTS,
  BASE_ENTITY_ID_TAG,
  SUPERSEDES_MARKER
} from './constants.mjs'

export const now_seconds = () => Math.floor(Date.now() / 1000)

export const format_board_address = ({ owner_pubkey, d_tag }) =>
  `${TASK_BOARD_KINDS.repository_announcement}:${owner_pubkey}:${d_tag}`

const require_value = (value, name) => {
  if (value === undefined || value === null || value === '') {
    throw new Error(`missing ${name}`)
  }
  return value
}

export function build_board_announcement({
  board,
  name,
  description = '',
  web_urls = [],
  relays = [],
  maintainers = [],
  topics = [],
  created_at = now_seconds()
}) {
  const tags = [
    ['d', require_value(board.d_tag, 'board.d_tag')],
    ['name', require_value(name, 'name')],
    ['description', description]
  ]
  for (const url of web_urls) tags.push(['web', url])
  if (relays.length) tags.push(['relays', ...relays])
  if (maintainers.length) tags.push(['maintainers', ...maintainers])
  for (const topic of topics) tags.push(['t', topic])

  return {
    kind: TASK_BOARD_KINDS.repository_announcement,
    created_at,
    tags,
    content: ''
  }
}

export function build_task_issue({
  board,
  subject,
  content = '',
  topics = [],
  base_entity_id,
  supersedes_issue_id,
  created_at = now_seconds()
}) {
  const tags = [
    ['a', format_board_address(board)],
    ['p', board.owner_pubkey],
    ['subject', require_value(subject, 'subject')]
  ]
  for (const topic of topics) tags.push(['t', topic])
  if (base_entity_id) tags.push([BASE_ENTITY_ID_TAG, base_entity_id])
  if (supersedes_issue_id) {
    tags.push(['e', supersedes_issue_id, '', SUPERSEDES_MARKER])
  }

  return { kind: TASK_BOARD_KINDS.issue, created_at, tags, content }
}

// issue is { id, pubkey } of the NIP-34 issue being acted on.
export function build_task_status({
  board,
  issue,
  status,
  content = '',
  created_at = now_seconds()
}) {
  const kind = TASK_STATUS_KINDS[status]
  if (!kind) throw new Error(`unknown task status: ${status}`)

  const tags = [
    ['e', require_value(issue.id, 'issue.id'), '', 'root'],
    ['a', format_board_address(board)],
    ['p', board.owner_pubkey]
  ]
  if (issue.pubkey !== board.owner_pubkey) tags.push(['p', issue.pubkey])

  return { kind, created_at, tags, content }
}

export function build_task_label({
  issue,
  namespace,
  value,
  created_at = now_seconds()
}) {
  const allowed = TASK_LABEL_VALUES[namespace]
  if (!allowed) throw new Error(`unknown label namespace: ${namespace}`)
  if (!allowed.includes(value)) {
    throw new Error(`invalid ${namespace} value: ${value}`)
  }

  return {
    kind: TASK_BOARD_KINDS.label,
    created_at,
    tags: [
      ['L', namespace],
      ['l', value, namespace],
      ['e', require_value(issue.id, 'issue.id')]
    ],
    content: ''
  }
}

export function build_task_claim({
  board,
  issue,
  status = 'active',
  created_at = now_seconds(),
  expiration = created_at + CLAIM_LIFETIME_SECONDS
}) {
  if (!CLAIM_STATUSES.includes(status)) {
    throw new Error(`unknown claim status: ${status}`)
  }
  const issue_id = require_value(issue.id, 'issue.id')

  return {
    kind: TASK_BOARD_KINDS.claim,
    created_at,
    tags: [
      ['d', issue_id],
      ['e', issue_id],
      ['a', format_board_address(board)],
      ['status', status],
      ['expiration', String(expiration)]
    ],
    content: ''
  }
}

// A claim replaces the claimant's previous one only if it is strictly newer;
// on equal created_at the lowest id wins, so a release signed in the same
// second as a renewal could lose. Dates the claim template after `previous`
// (the claimant's last claim on the issue), moving its expiration with it.
export function order_claim_after({ template, previous }) {
  if (!previous || previous.created_at < template.created_at) return template
  const created_at = previous.created_at + 1
  return {
    ...template,
    created_at,
    tags: template.tags.map((tag) =>
      tag[0] === 'expiration'
        ? ['expiration', String(created_at + CLAIM_LIFETIME_SECONDS)]
        : tag
    )
  }
}

// NIP-22 comment. parent defaults to the issue itself; pass a comment event
// as parent to reply to it.
export function build_task_comment({
  issue,
  parent = null,
  content,
  references = [],
  relay_hint = '',
  created_at = now_seconds()
}) {
  const issue_id = require_value(issue.id, 'issue.id')
  const reply_to = parent || { ...issue, kind: TASK_BOARD_KINDS.issue }

  return {
    kind: TASK_BOARD_KINDS.comment,
    created_at,
    tags: [
      ['E', issue_id, relay_hint, issue.pubkey],
      ['K', String(TASK_BOARD_KINDS.issue)],
      ['P', issue.pubkey],
      ['e', reply_to.id, relay_hint, reply_to.pubkey],
      ['k', String(reply_to.kind)],
      ['p', reply_to.pubkey],
      ...references.map((url) => ['r', url])
    ],
    content: require_value(content, 'content')
  }
}

export function build_triage_set({
  pubkeys,
  title = 'Nano community trusted contributors',
  created_at = now_seconds()
}) {
  return {
    kind: TASK_BOARD_KINDS.follow_set,
    created_at,
    tags: [
      ['d', TRIAGE_SET_D_TAG],
      ['title', title],
      ...pubkeys.map((pubkey) => ['p', pubkey])
    ],
    content: ''
  }
}

// A key's properties on a board, replacing its previous ones. Relations are
// `p` tags with the role as marker: [{ role: 'acts_for', pubkey }].
export function build_key_properties({
  board,
  relations = [],
  keep_tags = [],
  created_at = now_seconds()
}) {
  const address = format_board_address(board)
  for (const { role } of relations) {
    if (!KEY_RELATION_COUNTERPARTS[role]) {
      throw new Error(`unknown relation role: ${role}`)
    }
  }
  return {
    kind: TASK_BOARD_KINDS.key_properties,
    created_at,
    tags: [
      ['d', address],
      ['a', address],
      ...relations.map(({ role, pubkey }) => [
        'p',
        require_value(pubkey, 'relation pubkey'),
        '',
        role
      ]),
      ...keep_tags
    ],
    content: ''
  }
}

// Adds or removes one relation on top of a key's previous properties event.
// Tags this client does not understand are carried over untouched, so a
// newer client's properties survive an edit from an older one.
export function edit_key_relation({
  board,
  previous,
  role,
  pubkey,
  remove = false,
  created_at = now_seconds()
}) {
  const known = (tag) => tag[0] === 'p' && KEY_RELATION_COUNTERPARTS[tag[3]]
  const previous_tags = previous ? previous.tags : []
  const relations = previous_tags
    .filter(known)
    .map((tag) => ({ role: tag[3], pubkey: tag[1] }))
    .filter((relation) => relation.role !== role || relation.pubkey !== pubkey)
  if (!remove) relations.push({ role, pubkey })
  const keep_tags = previous_tags.filter(
    (tag) => tag[0] !== 'd' && tag[0] !== 'a' && !known(tag)
  )
  return build_key_properties({ board, relations, keep_tags, created_at })
}

// NIP-09 deletion request for events the signer authored.
export function build_deletion_request({
  events,
  reason = '',
  created_at = now_seconds()
}) {
  const tags = events.map(({ id }) => ['e', id])
  const kinds = [...new Set(events.map(({ kind }) => kind))]
  for (const kind of kinds) tags.push(['k', String(kind)])

  return {
    kind: TASK_BOARD_KINDS.deletion_request,
    created_at,
    tags,
    content: reason
  }
}
