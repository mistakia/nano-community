import knex from '#db'
import path, { dirname } from 'path'
import fs from 'fs/promises'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const sqlFile = path.resolve(__dirname, '../db/schema.sql')

export async function mochaGlobalSetup() {
  const sql = await fs.readFile(sqlFile, 'utf8')
  await knex.raw(sql)
}
