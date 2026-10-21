module.exports = {
  apps: [
    {
      script: 'server.mjs',
      // The fleet node through nvm's `current`, so a restart after a fleet node
      // bump runs the new version (bootstrap docs/guides/toolchain.md).
      interpreter: require('path').join(
        require('os').homedir(),
        '.nvm/versions/node/current/bin/node'
      ),
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
