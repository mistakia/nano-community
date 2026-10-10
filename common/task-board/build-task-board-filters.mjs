// Relay filters that fetch a board. A client subscribes to the board filters,
// then to the issue filters for every issue id it has seen.

import {
  TASK_BOARD_KINDS,
  VOUCH_SET_D_TAG,
  BLOCK_SET_D_TAG
} from './constants.mjs'
import { format_board_address } from './build-task-board-events.mjs'

const STATUS_KINDS = [
  TASK_BOARD_KINDS.status_open,
  TASK_BOARD_KINDS.status_resolved,
  TASK_BOARD_KINDS.status_closed,
  TASK_BOARD_KINDS.status_draft
]

export const build_board_filters = (board) => {
  const address = format_board_address(board)
  return [
    {
      kinds: [TASK_BOARD_KINDS.repository_announcement],
      authors: [board.owner_pubkey],
      '#d': [board.d_tag]
    },
    { kinds: [TASK_BOARD_KINDS.issue], '#a': [address] },
    { kinds: STATUS_KINDS, '#a': [address] },
    { kinds: [TASK_BOARD_KINDS.claim], '#a': [address] },
    { kinds: [TASK_BOARD_KINDS.key_properties], '#a': [address] },
    {
      kinds: [TASK_BOARD_KINDS.follow_set],
      '#d': [VOUCH_SET_D_TAG, BLOCK_SET_D_TAG]
    }
  ]
}

// Events that reference issues without the board tag: labels, statuses from
// other NIP-34 clients, deletions, and comments.
export const build_issue_filters = (issue_ids) => [
  {
    kinds: [
      TASK_BOARD_KINDS.label,
      TASK_BOARD_KINDS.deletion_request,
      ...STATUS_KINDS
    ],
    '#e': issue_ids
  },
  { kinds: [TASK_BOARD_KINDS.comment], '#E': issue_ids }
]
