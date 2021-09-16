module.exports = {
  apps : [{
    name: "HotWallet",
    script: './app.js',
    instances: 1,
    log_file: './logs/pm2.log',
    env: {
      NODE_ENV: "development",
    },
    env_production: {
      NODE_ENV: "production",
    }
  }],

  deploy : {
    production : {
      'post-deploy' : 'yarn install && pm2 reload ecosystem.config.js --env production'
    }
  }
};
