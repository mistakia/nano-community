import express from 'express'
import { tools } from 'nanocurrency-web'
import BigNumber from 'bignumber.js'

import { rpc, verify_nano_community_message_signature } from '#common'
import {
  ACCOUNT_TRACKING_MINIMUM_BALANCE,
  REPRESENTATIVE_TRACKING_MINIMUM_VOTING_WEIGHT
} from '#constants'

const router = express.Router()

router.post('/?', async (req, res) => {
  const { logger, db } = req.app.locals
  try {
    const { message } = req.body

    const {
      version,

      entry_id,
      chain_id,
      entry_clock,
      chain_clock,

      public_key,
      operation,
      content,
      tags,

      references,

      created_at,

      signature
    } = message

    if (version !== 1) {
      return res.status(400).json({ error: 'Invalid message version' })
    }

    // entry_id must be null or 32 byte hash
    if (entry_id && entry_id.length !== 64) {
      return res.status(400).json({ error: 'Invalid entry_id' })
    }

    // chain_id must be null or 32 byte hash
    if (chain_id && chain_id.length !== 64) {
      return res.status(400).json({ error: 'Invalid chain_id' })
    }

    // entry_clock must be null or positive integer
    if (entry_clock && entry_clock < 0) {
      return res.status(400).json({ error: 'Invalid entry_clock' })
    }

    // chain_clock must be null or positive integer
    if (chain_clock && chain_clock < 0) {
      return res.status(400).json({ error: 'Invalid chain_clock' })
    }

    // public_key must be 32 byte hash
    if (public_key.length !== 64) {
      return res.status(400).json({ error: 'Invalid public_key' })
    }

    // operation must be SET or DELETE
    const allowed_operations = ['SET', 'SET_ACCOUNT_META', 'SET_BLOCK_META']
    if (!allowed_operations.includes(operation)) {
      return res.status(400).json({ error: 'Invalid operation' })
    }

    // content must be null or string
    if (content && typeof content !== 'string') {
      return res.status(400).json({ error: 'Invalid content' })
    }

    // tags must be null or array of strings
    if (tags && !Array.isArray(tags)) {
      return res.status(400).json({ error: 'Invalid tags' })
    }

    // references must be null or array of strings
    if (references && !Array.isArray(references)) {
      return res.status(400).json({ error: 'Invalid references' })
    }

    // created_at must be null or positive integer
    if (created_at && created_at < 0) {
      return res.status(400).json({ error: 'Invalid created_at' })
    }

    // signature must be 64 byte hash
    if (signature.length !== 128) {
      return res.status(400).json({ error: 'Invalid signature' })
    }

    // validate signature
    const is_valid_signature = verify_nano_community_message_signature({
      entry_id,
      chain_id,
      entry_clock,
      chain_clock,
      public_key,
      operation,
      content,
      tags,
      references,
      created_at,
      signature
    })
    if (!is_valid_signature) {
      return res.status(400).json({ error: 'Invalid signature' })
    }

    // public_key can be a linked keypair or an existing nano account
    const linked_accounts = await db('account_keys')
      .select('account')
      .where({ public_key })
      .whereNull('revoked_at')
    const nano_account = tools.publicKeyToAddress(public_key)

    const all_accounts = [
      ...linked_accounts.map((row) => row.account),
      nano_account
    ]

    const accounts_info = []
    for (const account of all_accounts) {
      const account_info = await rpc.accountInfo({ account })
      if (account_info) {
        accounts_info.push(account_info)
      }
    }

    // check if any of the accounts have a balance beyond the tracking threshold
    const has_balance = accounts_info.some((account_info) =>
      new BigNumber(account_info.balance).gte(ACCOUNT_TRACKING_MINIMUM_BALANCE)
    )

    // check if any of the accounts have weight beyond the tracking threshold
    const has_weight = accounts_info.some((account_info) =>
      new BigNumber(account_info.weight).gte(
        REPRESENTATIVE_TRACKING_MINIMUM_VOTING_WEIGHT
      )
    )

    if (has_balance || has_weight) {
      await db('nano_community_messages')
        .insert({
          version,

          entry_id,
          chain_id,
          entry_clock,
          chain_clock,

          public_key,
          operation,
          content,
          tags: tags.length > 0 ? tags.join(', ') : null,

          signature,

          references: references.length > 0 ? references.join(', ') : null,

          created_at
        })
        .onConflict()
        .merge()
    }

    res.status(200).send({
      version,

      entry_id,
      chain_id,
      entry_clock,
      chain_clock,

      public_key,
      operation,
      content,
      tags,

      references,

      created_at
    })
  } catch (error) {
    console.log(error)
    logger(error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
