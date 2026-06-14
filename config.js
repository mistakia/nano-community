const crypto = require('crypto')
const fs = require('fs')

const env = process.env.NODE_ENV || 'test'
const config_path = `./config.${env}.js`

const config = require(config_path)

// Inline AES-256-CBC decryption of `ENCRYPTED|iv_hex|ciphertext_hex` values.
//
// Adopts the fleet secrets pattern (harden-secrets-posture WS1; Incident
// 2026-06-10 follow-up): the decryption key lives ONLY in a mode-0600 keyfile
// referenced by CONFIG_ENCRYPTION_KEY_FILE — never inline, never beside the
// ciphertext — so config.production.js can hold encrypted secrets at rest while
// the key that unlocks them stays off the same medium (key-separation). Format
// and algorithm are byte-identical to the rest of the fleet
// (repository/active/base/libs-server/crypto/encrypted-value.mjs and league's
// @tsmx/secure-config), so values are interchangeable. Uses node:crypto builtins
// — no new dependency, and works with this CommonJS require()-based loader.
//
// Decryption only runs when the loaded config actually contains ENCRYPTED|
// values, so plaintext dev/test configs load unchanged with no key required.
const ENCRYPTED_PREFIX = 'ENCRYPTED|'

const has_encrypted = (obj) =>
  Object.values(obj).some((v) =>
    typeof v === 'string'
      ? v.startsWith(ENCRYPTED_PREFIX)
      : v && typeof v === 'object' && !Array.isArray(v)
        ? has_encrypted(v)
        : false
  )

if (has_encrypted(config)) {
  const key_file = process.env.CONFIG_ENCRYPTION_KEY_FILE
  if (!key_file) {
    throw new Error(
      `config.${env}.js contains ENCRYPTED| values but CONFIG_ENCRYPTION_KEY_FILE is not set`
    )
  }
  let raw
  try {
    raw = fs.readFileSync(key_file, 'utf8').trim()
  } catch (err) {
    throw new Error(
      `CONFIG_ENCRYPTION_KEY_FILE unreadable: ${key_file}: ${err.code || err.message}`
    )
  }
  let key
  if (raw.length === 32) {
    key = Buffer.from(raw)
  } else if (/^[0-9A-Fa-f]{64}$/.test(raw)) {
    key = Buffer.from(raw, 'hex')
  } else {
    throw new Error(
      'CONFIG_ENCRYPTION_KEY_FILE contents must be 32 raw bytes or 64 hex chars'
    )
  }

  const decrypt = (value) => {
    const parts = value.split('|')
    if (parts.length !== 3) {
      throw new Error('malformed ENCRYPTED| value')
    }
    const iv = Buffer.from(parts[1], 'hex')
    const ct = Buffer.from(parts[2], 'hex')
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv)
    return Buffer.concat([decipher.update(ct), decipher.final()]).toString(
      'utf8'
    )
  }

  const walk = (obj) => {
    for (const k of Object.keys(obj)) {
      const v = obj[k]
      if (typeof v === 'string' && v.startsWith(ENCRYPTED_PREFIX)) {
        obj[k] = decrypt(v)
      } else if (v && typeof v === 'object' && !Array.isArray(v)) {
        walk(v)
      }
    }
  }

  walk(config)
}

module.exports = config
