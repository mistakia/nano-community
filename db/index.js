const Knex = require('knex')
const config = require('../config')
const mysql = Knex(config.mysql)

module.exports = mysql
