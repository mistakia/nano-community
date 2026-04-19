import React from 'react'
import { useParams } from 'react-router-dom'

import AccountPage from '@pages/account'
import BlockPage from '@pages/block'
import DocPage from '@pages/doc'

const ACCOUNT_REGEX = /^(nano_|xrb_)[13][13456789abcdefghijkmnopqrstuwxyz]{59}$/
const BLOCK_REGEX = /^[0-9A-F]{64}$/

export default function DynamicPage() {
  const { id } = useParams()

  if (ACCOUNT_REGEX.test(id)) {
    const prefix = id.startsWith('nano_') ? 'nano_' : 'xrb_'
    const address = id.slice(prefix.length)
    const match = { params: { prefix, address } }
    return <AccountPage match={match} />
  }

  if (BLOCK_REGEX.test(id)) {
    const match = { params: { hash: id } }
    return <BlockPage match={match} />
  }

  return <DocPage />
}
