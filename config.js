const os = require('os')
const path = require('path')
const { spawnSync } = require('child_process')

const env = process.env.NODE_ENV || 'test'

// Config loading, two cases:
//
//  - production: secrets are sops/age-encrypted at rest in config.production.json
//    (values encrypted to this host's age recipient; recipient policy in
//    .sops.yaml). We decrypt by shelling out to the system `sops` binary, which
//    is on PATH on every host (bootstrap install-sops-age.sh / brew). Shelling
//    out — rather than a bundled JS age library — keeps one decrypt shape across
//    the fleet's ESM, CommonJS, and compiled consumers. This replaces the prior
//    inline AES-256-CBC `ENCRYPTED|` scheme (deleted): age envelope encryption
//    compartmentalizes by host, so this VPS reads only what its own identity
//    unwraps, and the ciphertext is safe to replicate.
//
//  - test / development: plaintext config.${env}.js, loaded unchanged (no
//    secrets, no decryption, no key required).
//
// Fail-closed by construction in production: a missing identity, a missing
// binary, a missing file, or any sops error THROWS — there is no path that runs
// on ciphertext-as-config.

// sops's default age-key search path is OS-dependent (macOS uses ~/Library/...),
// so export the canonical fleet path explicitly. Override via SOPS_AGE_KEY_FILE.
const resolve_age_key_file = () =>
  process.env.SOPS_AGE_KEY_FILE ||
  path.join(os.homedir(), '.config', 'sops', 'age', 'keys.txt')

const load_sops_json = (file_path) => {
  const result = spawnSync(
    'sops',
    ['--decrypt', '--input-type', 'json', '--output-type', 'json', file_path],
    {
      encoding: 'utf8',
      maxBuffer: 16 * 1024 * 1024,
      env: { ...process.env, SOPS_AGE_KEY_FILE: resolve_age_key_file() }
    }
  )
  if (result.error) {
    if (result.error.code === 'ENOENT') {
      throw new Error(
        'sops binary not found on PATH (install via bootstrap install-sops-age.sh or brew)'
      )
    }
    throw new Error(`sops invocation failed: ${result.error.message}`)
  }
  if (result.status !== 0) {
    const detail = (result.stderr || '').trim() || `exit ${result.status}`
    throw new Error(`sops --decrypt failed for ${file_path}: ${detail}`)
  }
  return JSON.parse(result.stdout)
}

const config =
  env === 'production'
    ? load_sops_json(path.join(__dirname, 'config.production.json'))
    : require(`./config.${env}.js`)

module.exports = config
