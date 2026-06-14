module.exports = {
  apps: [
    {
      script: 'server.mjs',
      watch: '.',
      ignore_watch: ['build', 'static', 'test'],
      env_production: {
        NODE_ENV: 'production',
        // Path (not the key) to the mode-0600 keyfile that config.js uses to
        // decrypt ENCRYPTED| values in config.production.js. harden-secrets WS1.
        CONFIG_ENCRYPTION_KEY_FILE: '/root/.config-encryption-key'
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
