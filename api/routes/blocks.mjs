import express from 'express'

import { rpc } from '#common'
import { BURN_ACCOUNT } from '#constants'

const router = express.Router()

router.get('/:hash', async (req, res) => {
  const { logger, cache, db } = req.app.locals
  try {
    const { hash } = req.params

    if (!hash) {
      return res.status(401).send({ error: 'missing hash' })
    }

    const re = /^[0-9A-F]{64}$/gi
    if (!re.test(hash)) {
      return res.status(401).send({ error: 'invalid hash' })
    }

    // Lowercase, as block notes store it, so a new note's invalidation hits
    const cacheKey = `/block/${hash.toLowerCase()}`
    const cachedValue = cache.get(cacheKey)
    if (cachedValue) {
      return res.status(200).send(cachedValue)
    }

    const blocksInfo = await rpc.blocksInfo({
      hashes: [hash],
      source: true
    })
    if (!blocksInfo) {
      return res.status(503).send({ error: 'node unavailable' })
    }
    const blockInfo = blocksInfo.blocks && blocksInfo.blocks[hash]
    if (!blockInfo) {
      return res.status(404).send({ error: 'block not found' })
    }

    // TODO if unconfirmed get confirmation height

    const linkAccount =
      (blockInfo.source_account !== '0' && blockInfo.source_account) ||
      (blockInfo.contents.link_as_account !== BURN_ACCOUNT &&
        blockInfo.contents.link_as_account) ||
      blockInfo.contents.destination ||
      blockInfo.contents.representative ||
      null
    const aliases = await db('accounts').whereIn('account', [
      linkAccount,
      blockInfo.block_account
    ])

    const block_note = await db('blocks_meta')
      .select('note', 'account', 'issued_at')
      .where({ block_hash: hash.toLowerCase() })
      .whereNull('hidden_at')
      .whereNot({ note: '' })
      .first()

    const data = {
      blockInfo,
      linkAccountAlias: null,
      blockAccountAlias: null,
      blockNote: block_note
        ? { ...block_note, issued_at: Number(block_note.issued_at) }
        : null
    }

    const linkRow = aliases.find((a) => a.account === linkAccount)
    if (linkRow) {
      data.linkAccountAlias = linkRow.alias
    }
    const blockAccountRow = aliases.find(
      (a) => a.account === blockInfo.block_account
    )
    if (blockAccountRow) {
      data.blockAccountAlias = blockAccountRow.alias
    }

    cache.set(cacheKey, data, 30)
    res.status(200).send(data)
  } catch (error) {
    logger(error)
    res.status(500).send({ error: error.toString() })
  }
})

export default router
