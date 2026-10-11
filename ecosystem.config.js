module.exports = {
  apps: [
    {
      script: 'server.mjs',
      watch: '.',
      ignore_watch: ['build', 'static', 'test'],
      env_production: {
        NODE_ENV: 'production',
        // Path (not the key) to this host's mode-0600 age identity, which
        // config.js exports to `sops` to decrypt config.production.json. Its own
        // identity (not the shared /root/.config-encryption-key) — resolving the
        // fleet-vs-nano keyfile-path collision. sops/age migration, Phase C.
        SOPS_AGE_KEY_FILE: '/root/.config/sops/age/keys.txt'
      },
      max_memory_restart: '2G'
    }
  ]
}
