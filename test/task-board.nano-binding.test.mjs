/* global describe it */
import chai from 'chai'
import fs from 'fs'
import { nip19 } from 'nostr-tools'
import {
  encode_signed_message,
  sign_message,
  verify_signed_message
} from 'nano-signed-message'

import {
  build_bind_nostr_key_payload,
  build_nano_account_binding,
  parse_nano_account_binding
} from '#common/task-board/index.mjs'

const expect = chai.expect

// From the nano-signed-message test vectors: "nostr bind_nostr_key, direct mode".
const VECTOR = {
  private_key:
    '9f0e444c69f77a49bd0be89db92c38fe713e0963165cca12faf5712d7657120f',
  account: 'nano_3i1aq1cchnmbn9x5rsbap8b15akfh7wj7pwskuzi7ahz8oq6cobd99d4r3b7',
  nostr_public_key:
    '7e7e9c42a91bfef19fa929e5fda1b72e0ebc1a4c1141673e2794234d86addf4e',
  issued_at: 1760054400
}

const sign_binding = () => {
  const payload = build_bind_nostr_key_payload({
    account: VECTOR.account,
    npub: nip19.npubEncode(VECTOR.nostr_public_key),
    issued_at: VECTOR.issued_at
  })
  return {
    payload,
    ...sign_message({ payload, private_key: VECTOR.private_key })
  }
}

describe('task board Nano account binding', () => {
  it('builds the payload the library test vector signs', () => {
    const { payload, message } = sign_binding()
    expect(message).to.equal(encode_signed_message(payload))
    expect(payload.statement).to.equal(
      'Verifying that I control the following Nostr public key: npub10elfcs4fr0l0r8af98jlmgdh9c8tcxjvz9qkw038js35mp4dma8qzvjptg'
    )
  })

  it('round-trips a binding event and its proof verifies', () => {
    const { signature } = sign_binding()
    const event = {
      ...build_nano_account_binding({
        account: VECTOR.account,
        issued_at: VECTOR.issued_at,
        signature
      }),
      pubkey: VECTOR.nostr_public_key
    }
    const binding = parse_nano_account_binding(event)
    expect(binding).to.deep.equal({
      account: VECTOR.account,
      issued_at: VECTOR.issued_at,
      signature
    })
    const rebuilt = build_bind_nostr_key_payload({
      account: binding.account,
      npub: nip19.npubEncode(event.pubkey),
      issued_at: binding.issued_at
    })
    const verified = verify_signed_message({
      message: encode_signed_message(rebuilt),
      signature: binding.signature,
      domain: 'nostr',
      actions: ['bind_nostr_key']
    })
    expect(verified.payload.account).to.equal(VECTOR.account)
  })

  it('reads no binding from a malformed or ambiguous event', () => {
    const { signature } = sign_binding()
    const good = build_nano_account_binding({
      account: VECTOR.account,
      issued_at: VECTOR.issued_at,
      signature
    })
    const with_tags = (tags) => ({ ...good, tags })
    expect(parse_nano_account_binding(with_tags([]))).to.equal(null)
    expect(
      parse_nano_account_binding(with_tags([...good.tags, ...good.tags]))
    ).to.equal(null)
    expect(
      parse_nano_account_binding(
        with_tags([['i', `nano:${VECTOR.account}`, `01:${signature}`]])
      )
    ).to.equal(null)
    expect(
      parse_nano_account_binding(
        with_tags([['i', 'nano:xrb_1abc', `1:${signature}`]])
      )
    ).to.equal(null)
    expect(() =>
      build_nano_account_binding({
        account: 'nano_1',
        issued_at: 1,
        signature
      })
    ).to.throw('not a nano_ account')
  })

  it('the spec example binding verifies against its author', () => {
    const spec = fs.readFileSync('docs/design/task-board-protocol.md', 'utf8')
    const event = [...spec.matchAll(/```json\n([\s\S]*?)```/g)]
      .map((m) => JSON.parse(m[1]))
      .find((e) => e.kind === 10011)
    const binding = parse_nano_account_binding(event)
    const message = encode_signed_message(
      build_bind_nostr_key_payload({
        account: binding.account,
        npub: nip19.npubEncode(event.pubkey),
        issued_at: binding.issued_at
      })
    )
    expect(
      verify_signed_message({
        message,
        signature: binding.signature,
        domain: 'nostr',
        actions: ['bind_nostr_key']
      }).payload.account
    ).to.equal(binding.account)
  })
})
