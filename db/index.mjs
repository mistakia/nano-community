import Knex from 'knex'
import config from '#config'

const mysql = Knex(config.mysql)

export default mysql
