import Knex from 'knex'
import pg from 'pg'
import config from '#config'

// PG returns NUMERIC (OID 1700) and BIGINT (OID 20) as String by default.
// The pre-migration MySQL config had `decimalNumbers: true`, which made
// mysql2 return DECIMAL as JS Number. Downstream code (api/routes/weight.mjs
// summary(), src/core/utils format_value, network selectors) does arithmetic
// that silently coerces Number but string-concatenates String -- producing
// e.g. (a + b) / 2 of two 38-digit strings as a 76-digit garbage value.
// Match the historical mysql2 behavior so all downstream math keeps working.
// Precision loss above 2^53 is the same lossy coercion that was happening
// pre-migration; display paths already use Number.
pg.types.setTypeParser(1700, parseFloat)
pg.types.setTypeParser(20, parseInt)

const knex = Knex(config.production_postgres)

export default knex
