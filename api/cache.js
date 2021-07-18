const NodeCache = require('node-cache')
const cache = new NodeCache({ stdTTL: 600, checkperiod: 120 })

module.exports = cache
