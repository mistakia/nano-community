// Path (not the key) to this host's mode-0600 age identity, which
// config.js exports to `sops` to decrypt config.production.json. Its own
// identity (not the shared /root/.config-encryption-key) — resolving the
// fleet-vs-nano keyfile-path collision. sops/age migration, Phase C.
const SOPS_AGE_KEY_FILE = '/root/.config/sops/age/keys.txt'

module.exports = {
  apps: [
    {
      script: 'server.mjs',
      watch: '.',
      ignore_watch: ['build', 'static', 'test'],
      env_production: {
        NODE_ENV: 'production',
        SOPS_AGE_KEY_FILE
      },
      max_memory_restart: '2G'
    },
    {
      // The long-lived nano-node-light observer. No file watch: its spool and
      // state live outside the checkout, and a deploy restarts it by name.
      name: 'network-observer',
      script: 'network-observer.mjs',
      watch: false,
      env_production: {
        NODE_ENV: 'production',
        SOPS_AGE_KEY_FILE,
        // report_job sends the heartbeat only when BASE_API_URL is set.
        BASE_API_URL: 'https://base.tint.space',
        BASE_MACHINE_SLUG: 'nano-community'
      },
      max_memory_restart: '1G',
      // time to save state and drain the spool on stop
      kill_timeout: 15000
    }
  ]
}
