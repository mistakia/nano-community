import Knex from 'knex'
import config from '#config'

const knex = Knex(config.production_postgres)

export default knex
