import { getEventHash } from 'nostr-tools'

import { get_event_pow } from '#common/task-board/index.mjs'

const yield_to_browser = () =>
  new Promise((resolve) => {
    if (typeof MessageChannel === 'undefined') return setTimeout(resolve, 0)
    const channel = new MessageChannel()
    channel.port1.onmessage = () => {
      channel.port1.close()
      resolve()
    }
    channel.port2.postMessage(null)
  })

// Mines a NIP-13 nonce into an unsigned event that already carries its pubkey.
// Hashes in short slices and yields between them, so the page stays
// responsive without a worker (the standalone client is one file). Like
// minePow, the event is dated now and re-dated as seconds pass.
export async function mine_event_pow({ template, difficulty, slice_ms = 12 }) {
  const nonce = ['nonce', '0', String(difficulty)]
  const event = {
    ...template,
    tags: [...template.tags.filter((tag) => tag[0] !== 'nonce'), nonce]
  }
  let count = 0
  for (;;) {
    const slice_end = Date.now() + slice_ms
    while (Date.now() < slice_end) {
      for (let i = 0; i < 200; i++) {
        const now = Math.floor(Date.now() / 1000)
        if (now !== event.created_at) {
          event.created_at = now
          count = 0
        }
        nonce[1] = String(++count)
        event.id = getEventHash(event)
        if (get_event_pow(event) >= difficulty) return event
      }
    }
    await yield_to_browser()
  }
}
