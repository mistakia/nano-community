import debug from 'debug'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'

import db from '#db'
import { isMain } from '#common'

const log = debug('hide-block-note')
debug.enable('hide-block-note')

// Hides a block note from the block page, or unhides it. The note stays in
// blocks_meta and in the message log; the block API stops returning it once
// its 30-second response cache expires.
export default async function hide_block_note({ block_hash, reason, unhide }) {
  const update = unhide
    ? { hidden_at: null, hidden_reason: null }
    : { hidden_at: Math.floor(Date.now() / 1000), hidden_reason: reason }
  const updated = await db('blocks_meta')
    .where({ block_hash: block_hash.toLowerCase() })
    .update(update)
  return updated > 0
}

if (isMain(import.meta.url)) {
  const main = async () => {
    const argv = yargs(hideBin(process.argv))
      .option('hash', { type: 'string', demandOption: true })
      .option('reason', { type: 'string' })
      .option('unhide', { type: 'boolean' })
      .check((argv) => {
        if (!argv.unhide && !argv.reason) {
          throw new Error('--reason is required unless --unhide is given')
        }
        return true
      })
      .parse()
    let exit_code = 0
    try {
      const found = await hide_block_note({
        block_hash: argv.hash,
        reason: argv.reason,
        unhide: argv.unhide
      })
      if (!found) {
        log(`no note for block ${argv.hash}`)
        exit_code = 1
      } else {
        log(`${argv.unhide ? 'unhid' : 'hid'} the note on ${argv.hash}`)
      }
    } catch (error) {
      log(error)
      exit_code = 1
    }
    process.exit(exit_code)
  }

  main()
}
