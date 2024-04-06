const env = process.env.NODE_ENV || 'test'
const config_path = `./config.${env}.js`

module.exports = require(config_path)
