import React from 'react'
import { useParams } from 'react-router-dom'

import lazy_page from '@views/lazy-page'

const AccountPage = lazy_page(
  () => import(/* webpackChunkName: "page-account" */ '@pages/account')
)
const BlockPage = lazy_page(
  () => import(/* webpackChunkName: "page-block" */ '@pages/block')
)
export const DocPage = lazy_page(
  () => import(/* webpackChunkName: "page-doc" */ '@pages/doc')
)

const ACCOUNT_REGEX = /^(nano_|xrb_)[13][13456789abcdefghijkmnopqrstuwxyz]{59}$/
const BLOCK_REGEX = /^[0-9A-F]{64}$/

export const preload_dynamic = (id) => {
  if (ACCOUNT_REGEX.test(id)) return AccountPage.preload()
  if (BLOCK_REGEX.test(id)) return BlockPage.preload()
  return DocPage.preload()
}

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
