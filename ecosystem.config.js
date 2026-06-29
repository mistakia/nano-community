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
  ],

  deploy: {
    production: {
      user: 'root',
      host: '178.18.253.104',
      ref: 'origin/main',
      repo: 'https://github.com/mistakia/nano-community.git',
      path: '/root/nano-community',
      'pre-deploy': 'git pull',
      'pre-deploy-local': '',
      'post-deploy':
        'source /root/.bash_profile && /root/.nvm/versions/node/v22.22.1/bin/yarn install && pm2 reload ecosystem.config.js --env production',
      'pre-setup': ''
    }
  }
}
