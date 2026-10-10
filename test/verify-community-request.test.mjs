/* global describe it */
import chai from 'chai'
import crypto from 'crypto'
import {
  encode_nano_account,
  get_public_key,
  sign_message
} from 'nano-signed-message'

import verify_community_request, {
  CommunityRequestError,
  MAX_MESSAGE_BYTES
} from '#libs-server/verify-community-request.mjs'

const { expect } = chai

const private_key = crypto.randomBytes(32).toString('hex')
const now = Math.floor(Date.now() / 1000)

const sign = (statement) =>
  sign_message({
    private_key,
    payload: {
      version: 1,
      domain: 'nano.community',
      action: 'set_account_meta',
      account: encode_nano_account(get_public_key(private_key)),
      issued_at: now,
      nonce: crypto.randomBytes(16).toString('hex'),
      parameters: { content: {}, references: [], tags: [] },
      ...(statement !== undefined && { statement })
    }
  })

describe('verify_community_request', () => {
  it('accepts a message at the size cap', () => {
    const base_length = Buffer.byteLength(sign('').message, 'utf8')
    const wire_unit = sign('x'.repeat(MAX_MESSAGE_BYTES - base_length))
    expect(Buffer.byteLength(wire_unit.message, 'utf8')).to.equal(
      MAX_MESSAGE_BYTES
    )
    const result = verify_community_request({
      wire_unit,
      actions: ['set_account_meta'],
      now
    })
    expect(result.payload.action).to.equal('set_account_meta')
  })

  it('rejects a message over the size cap with 400 before verifying', () => {
    const base_length = Buffer.byteLength(sign('').message, 'utf8')
    const wire_unit = sign('x'.repeat(MAX_MESSAGE_BYTES - base_length + 1))
    let caught
    try {
      verify_community_request({
        wire_unit,
        actions: ['set_account_meta'],
        now
      })
    } catch (error) {
      caught = error
    }
    expect(caught).to.be.instanceOf(CommunityRequestError)
    expect(caught.status).to.equal(400)
    expect(caught.message).to.include('exceeds')
  })
})
