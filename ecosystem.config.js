module.exports = {
  apps: [
    {
      script: 'server.mjs',
      watch: '.',
      env_production: {
        NODE_ENV: 'production'
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
        'source /root/.bash_profile && /root/.nvm/versions/node/v14.17.0/bin/yarn install && pm2 reload ecosystem.config.js --env production',
      'pre-setup': ''
    }
  }
}
