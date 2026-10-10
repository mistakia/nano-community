import React from 'react'
import { useDispatch, useSelector } from 'react-redux'

import {
  nostr_identity_actions,
  get_nostr_identity
} from '@core/nostr-identity'
import PubkeyName from './pubkey-name'
import { use_task_board_links } from './task-board-links'

// Sends the visitor to the account page, remembering where to bring them back.
export function use_go_to_account() {
  const dispatch = useDispatch()
  const { current_path } = use_task_board_links()
  return () => dispatch(nostr_identity_actions.set_return_to(current_path()))
}

// Who you post as, or an invitation to join; either way a link to the account
// page, which holds everything about keys.
export default function IdentityLink() {
  const identity = useSelector(get_nostr_identity)
  const { Link, account_path } = use_task_board_links()
  const remember = use_go_to_account()
  const pubkey = identity.get('pubkey')

  return (
    <Link className='task-identity' to={account_path()} onClick={remember}>
      {pubkey ? (
        <>
          {identity.get('needs_backup') && (
            <span className='task-identity__dot' title='Key not saved yet' />
          )}
          <PubkeyName pubkey={pubkey} />
        </>
      ) : (
        'Join in'
      )}
    </Link>
  )
}
