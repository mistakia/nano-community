// bin/parse-mysqldump.mjs
//
// Streaming mysqldump parser. Emits per-row callbacks for tables listed in
// `targetTables`. Bypasses MySQL entirely; intended as a faster shovel than
// `mysql < dump.sql` for large dumps where InnoDB B-tree maintenance on HDD
// dominates verifier runtime. See bin/verify-dump-via-pg.mjs for the consumer
// and user:task/homelab/verify-2025-05-04-dump-via-pg.md for the plan.
//
// Recognized mysqldump grammar subset:
//   - CREATE TABLE `<name>` ( ... ) ENGINE=...;
//   - INSERT INTO `<name>` VALUES (...),(...),...;
//   - everything else (LOCK TABLES, SET, DROP, ALTER ENABLE/DISABLE KEYS,
//     comments, blank lines) is skipped.
//
// Backslash escapes inside single-quoted string fields:
//   \'  ->  '       \"  ->  "       \\  ->  \
//   \n  ->  LF      \r  ->  CR      \t  ->  TAB
//   \b  ->  BS      \0  ->  NUL     \Z  ->  0x1A
//   \X  ->  X       (any other char: pass through bare)
//
// Outside strings: literal NULL (uppercase, unquoted) -> JS null; numeric
// tokens (digits/sign/dot) pass through as strings (PG casts on COPY).

import { createReadStream } from 'node:fs'
import { createInterface } from 'node:readline'

const PROGRESS_BYTES = 256 * 1024 * 1024

// State machine constants for the tuple-list parser.
const BEFORE_TUPLE = 1
const IN_BARE = 2
const IN_QUOTED = 3
const IN_ESCAPE = 4
const BETWEEN_FIELDS = 5

export async function parseMysqlDump ({ dumpPath, targetTables, onRow, onProgress } = {}) {
  if (!dumpPath) throw new Error('parseMysqlDump: dumpPath required')
  if (!targetTables || typeof targetTables !== 'object') throw new Error('parseMysqlDump: targetTables required')
  if (typeof onRow !== 'function') throw new Error('parseMysqlDump: onRow required')

  const schemas = Object.create(null) // table -> { columns: [], indexByName: {} }
  const rowsByTable = Object.create(null)
  for (const t of Object.keys(targetTables)) rowsByTable[t] = 0

  let collectingTable = null // table name we are inside the CREATE TABLE block for
  let bytesRead = 0
  let nextProgressAt = PROGRESS_BYTES
  let lastProgressTable = null

  const stream = createReadStream(dumpPath, { encoding: 'utf8', highWaterMark: 4 * 1024 * 1024 })
  const rl = createInterface({ input: stream, crlfDelay: Infinity })

  for await (const line of rl) {
    bytesRead += Buffer.byteLength(line, 'utf8') + 1 // +1 for the consumed newline

    if (collectingTable) {
      if (line.startsWith(') ENGINE=') || line.startsWith(')ENGINE=') || line.startsWith(') /*!')) {
        collectingTable = null
        continue
      }
      const col = matchColumnDef(line)
      if (col) {
        const s = schemas[collectingTable]
        s.indexByName[col] = s.columns.length
        s.columns.push(col)
      }
      continue
    }

    if (line.startsWith('CREATE TABLE ')) {
      const name = matchCreateTable(line)
      if (name) {
        collectingTable = name
        schemas[name] = { columns: [], indexByName: Object.create(null) }
      }
      continue
    }

    if (line.startsWith('INSERT INTO ')) {
      const ins = matchInsertInto(line)
      if (!ins) continue
      const { table, valuesStart } = ins
      if (!(table in targetTables)) continue
      const schema = schemas[table]
      if (!schema || schema.columns.length === 0) {
        throw new Error(`parseMysqlDump: INSERT INTO \`${table}\` before its CREATE TABLE block`)
      }
      const projection = targetTables[table]
      const ordinals = projection.map((col) => {
        if (!(col in schema.indexByName)) {
          throw new Error(`parseMysqlDump: column \`${col}\` not found in table \`${table}\` (have: ${schema.columns.join(',')})`)
        }
        return schema.indexByName[col]
      })
      const ncols = schema.columns.length
      const count = emitTuples({
        line,
        startIdx: valuesStart,
        ncols,
        ordinals,
        projection,
        table,
        onRow
      })
      rowsByTable[table] += count

      if (bytesRead >= nextProgressAt || lastProgressTable !== table) {
        if (onProgress) onProgress({ bytesRead, table, rowsByTable: { ...rowsByTable } })
        lastProgressTable = table
        if (bytesRead >= nextProgressAt) nextProgressAt = bytesRead + PROGRESS_BYTES
      }
      continue
    }

    // skip everything else
  }

  if (onProgress) onProgress({ bytesRead, table: null, rowsByTable: { ...rowsByTable }, eof: true })

  return { schemas, rowsByTable, bytesRead }
}

function matchCreateTable (line) {
  // CREATE TABLE `<name>` (
  const m = line.match(/^CREATE TABLE `([^`]+)` \(/)
  return m ? m[1] : null
}

function matchColumnDef (line) {
  // Leading whitespace + `<colname>` <typedef> ...
  // Stop accepting if the line is a constraint (PRIMARY KEY, UNIQUE KEY, KEY,
  // CONSTRAINT, FOREIGN KEY, FULLTEXT, SPATIAL).
  const m = line.match(/^\s*`([^`]+)`\s/)
  if (!m) return null
  return m[1]
}

function matchInsertInto (line) {
  // INSERT INTO `<name>` VALUES (...
  const prefix = 'INSERT INTO `'
  if (!line.startsWith(prefix)) return null
  const close = line.indexOf('`', prefix.length)
  if (close < 0) return null
  const table = line.slice(prefix.length, close)
  const valuesTag = '` VALUES '
  if (line.slice(close, close + valuesTag.length) !== valuesTag) return null
  const valuesStart = close + valuesTag.length
  return { table, valuesStart }
}

function emitTuples ({ line, startIdx, ncols, ordinals, projection, table, onRow }) {
  let state = BEFORE_TUPLE
  let i = startIdx
  const n = line.length
  let colIdx = 0
  let buf = ''
  let isQuoted = false // tracks whether the current field was wrapped in '...'
  const fields = new Array(ncols)
  let emitted = 0

  while (i < n) {
    const ch = line.charCodeAt(i)

    if (state === BEFORE_TUPLE) {
      if (ch === 40) { // '('
        colIdx = 0
        buf = ''
        isQuoted = false
        state = IN_BARE
        i++
        // Peek: if next char is `'`, switch to IN_QUOTED on this turn.
        if (i < n && line.charCodeAt(i) === 39) {
          isQuoted = true
          state = IN_QUOTED
          i++
        }
        continue
      }
      i++
      continue
    }

    if (state === IN_BARE) {
      if (ch === 44 || ch === 41) { // ',' or ')'
        const val = isQuoted ? buf : interpretBare(buf)
        fields[colIdx++] = val
        if (ch === 41) {
          // End of tuple. Emit.
          const out = Object.create(null)
          for (let p = 0; p < ordinals.length; p++) out[projection[p]] = fields[ordinals[p]]
          onRow(table, out)
          emitted++
          state = BETWEEN_FIELDS
          i++
        } else {
          buf = ''
          isQuoted = false
          i++
          if (i < n && line.charCodeAt(i) === 39) {
            isQuoted = true
            state = IN_QUOTED
            i++
          } else {
            state = IN_BARE
          }
        }
        continue
      }
      buf += line[i]
      i++
      continue
    }

    if (state === IN_QUOTED) {
      if (ch === 92) { // '\'
        state = IN_ESCAPE
        i++
        continue
      }
      if (ch === 39) { // closing single-quote
        // Closing the quoted string. Switch to expecting , or ).
        const val = buf
        fields[colIdx++] = val
        i++
        // Skip to next field separator.
        if (i < n) {
          const nc = line.charCodeAt(i)
          if (nc === 44) {
            buf = ''
            isQuoted = false
            i++
            if (i < n && line.charCodeAt(i) === 39) {
              isQuoted = true
              state = IN_QUOTED
              i++
            } else {
              state = IN_BARE
            }
          } else if (nc === 41) {
            const out = Object.create(null)
            for (let p = 0; p < ordinals.length; p++) out[projection[p]] = fields[ordinals[p]]
            onRow(table, out)
            emitted++
            state = BETWEEN_FIELDS
            i++
          } else {
            throw new Error(`parseMysqlDump: unexpected char after quoted field in \`${table}\`: ${JSON.stringify(line.slice(Math.max(0, i - 20), i + 20))}`)
          }
        }
        continue
      }
      buf += line[i]
      i++
      continue
    }

    if (state === IN_ESCAPE) {
      buf += decodeEscape(line[i])
      state = IN_QUOTED
      i++
      continue
    }

    if (state === BETWEEN_FIELDS) {
      if (ch === 44) { // ',' tuple separator
        state = BEFORE_TUPLE
        i++
        continue
      }
      if (ch === 59) { // ';' end of INSERT
        break
      }
      // Skip whitespace.
      i++
      continue
    }
  }

  return emitted
}

function interpretBare (buf) {
  if (buf === 'NULL') return null
  return buf
}

function decodeEscape (c) {
  switch (c) {
    case "'": return "'"
    case '"': return '"'
    case '\\': return '\\'
    case 'n': return '\n'
    case 'r': return '\r'
    case 't': return '\t'
    case 'b': return '\b'
    case '0': return '\x00'
    case 'Z': return '\x1a'
    default: return c
  }
}
