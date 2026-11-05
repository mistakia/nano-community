/* global describe it */
import chai from 'chai'

import { pgEscape } from '#root/scripts/archive-to-postgres.mjs'

const expect = chai.expect

describe('archive pgEscape', () => {
  it('writes a jsonb object as valid JSON text', () => {
    const evidence = {
      began_at: 1700000000,
      peer_addresses: ['::ffff:10.0.0.1', '::ffff:10.0.0.2'],
      note: 'tab\there'
    }
    const escaped = pgEscape(evidence)
    expect(escaped).to.not.equal('[object Object]')
    // undo the COPY text-format escaping the way PG reads it back
    const copy_escapes = { n: '\n', r: '\r', t: '\t', '\\': '\\' }
    const copied = escaped.replace(/\\(.)/g, (_, c) => copy_escapes[c])
    expect(JSON.parse(copied)).to.deep.equal(evidence)
  })

  it('keeps scalars and nulls as before', () => {
    expect(pgEscape(null)).to.equal('\\N')
    expect(pgEscape(42)).to.equal('42')
    expect(pgEscape('a\nb')).to.equal('a\\nb')
  })
})
