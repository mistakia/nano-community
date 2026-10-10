import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'

import {
  task_board_actions,
  get_task_board,
  resolve_board_config
} from '@core/task-board'
import { nostr_identity_actions } from '@core/nostr-identity'

// Starts the relay subscription and signer detection once per page load.
export default function use_task_board_init() {
  const dispatch = useDispatch()
  const relays = useSelector(get_task_board).get('relays')
  useEffect(() => {
    if (relays.length) return
    dispatch(task_board_actions.init(resolve_board_config()))
    dispatch(nostr_identity_actions.init())
  }, [])
}
