import Knex from 'knex'
import * as config from '#config'

const mysql = Knex(config.mysql)

export default mysql
