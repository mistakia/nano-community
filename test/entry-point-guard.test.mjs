/* global describe it */
// Holds every cli/ and scripts/ file to the entry-point guard: importing a
// script must never run it.
//
// The rule is structural, read off the parsed top level, with no per-file
// allowlist. Outside `if (isMain(import.meta.url)) { ... }` a module's top
// level may hold only imports, exports, declarations and assignments. It fails
// on any top-level `await`, any control-flow statement (a hand-spelled guard
// included), any expression statement that calls something -- `main()`,
// `debug.enable(...)`, an IIFE, a console.log report -- and any declaration
// that calls a local async function. A call that registers a plugin or
// transport and does no work (ALLOWED_CALLS) is the one call allowed.

import chai from 'chai'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { fileURLToPath, pathToFileURL } from 'url'
import { parse } from 'acorn'

import { isMain } from '#common/is-main.mjs'

const expect = chai.expect
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

const GUARD = 'isMain(import.meta.url)'

const ALLOWED_CALLS = new Set(['useWebSocketImplementation', 'dayjs.extend'])

const is_function_like = (node) =>
  node.type === 'FunctionDeclaration' ||
  node.type === 'FunctionExpression' ||
  node.type === 'ArrowFunctionExpression' ||
  node.type === 'ClassDeclaration' ||
  node.type === 'ClassExpression'

// True when predicate holds for node or any descendant outside a nested
// function or class body.
const contains = (node, predicate) => {
  if (!node || typeof node.type !== 'string') return false
  if (predicate(node)) return true
  if (is_function_like(node)) return false
  for (const [key, value] of Object.entries(node)) {
    if (key === 'loc' || key === 'range') continue
    const children = Array.isArray(value) ? value : [value]
    for (const child of children) {
      if (child && typeof child.type === 'string' && contains(child, predicate))
        return true
    }
  }
  return false
}

const is_await = (node) =>
  node.type === 'AwaitExpression' ||
  (node.type === 'ForOfStatement' && node.await)

const is_call = (node) =>
  node.type === 'CallExpression' || node.type === 'NewExpression'

// Returns `line: text` for every top-level statement that runs work at import.
export const find_unguarded_work = (source) => {
  const program = parse(source, {
    ecmaVersion: 'latest',
    sourceType: 'module',
    allowHashBang: true,
    locations: true
  })
  const text = (node) => source.slice(node.start, node.end)

  const local_async = new Set()
  for (const statement of program.body) {
    const declaration =
      statement.type === 'ExportNamedDeclaration'
        ? statement.declaration
        : statement
    if (declaration?.type === 'FunctionDeclaration' && declaration.async)
      local_async.add(declaration.id.name)
  }
  const calls_local_async = (node) =>
    contains(
      node,
      (child) =>
        child.type === 'CallExpression' &&
        ((child.callee.type === 'Identifier' &&
          local_async.has(child.callee.name)) ||
          ((child.callee.type === 'ArrowFunctionExpression' ||
            child.callee.type === 'FunctionExpression') &&
            child.callee.async))
    )

  const offending = []
  for (const statement of program.body) {
    const node =
      (statement.type === 'ExportNamedDeclaration' && statement.declaration) ||
      statement
    let bad
    if (
      node.type === 'IfStatement' &&
      !node.alternate &&
      text(node.test) === GUARD
    ) {
      continue
    } else if (
      node.type === 'ImportDeclaration' ||
      node.type === 'FunctionDeclaration' ||
      node.type === 'ClassDeclaration' ||
      node.type === 'EmptyStatement' ||
      node.type === 'ExportNamedDeclaration' ||
      node.type === 'ExportAllDeclaration'
    ) {
      bad = contains(node, is_await)
    } else if (
      node.type === 'VariableDeclaration' ||
      node.type === 'ExportDefaultDeclaration'
    ) {
      bad = contains(node, is_await) || calls_local_async(node)
    } else if (node.type === 'ExpressionStatement') {
      const expression = node.expression
      const allowed =
        expression.type === 'CallExpression' &&
        ALLOWED_CALLS.has(text(expression.callee)) &&
        !contains(node, is_await)
      bad =
        !allowed &&
        !node.directive &&
        (contains(node, is_await) || contains(node, is_call))
    } else {
      // if / for / while / try / switch / block / throw / labeled
      bad = true
    }
    if (bad)
      offending.push(
        `${statement.loc.start.line}: ${text(statement).split('\n')[0].slice(0, 80)}`
      )
  }
  return offending
}

const list_scripts = () => {
  const scripts = []
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        if (entry.name !== 'node_modules') walk(full)
      } else if (
        entry.name.endsWith('.mjs') &&
        !/\.test\.mjs$/.test(entry.name)
      ) {
        scripts.push(full)
      }
    }
  }
  walk(path.join(root, 'cli'))
  walk(path.join(root, 'scripts'))
  return scripts
}

describe('script entry-point guard', () => {
  it('no cli/ or scripts/ file does work at import outside isMain', () => {
    const scanned = []
    const unguarded = []
    for (const full of list_scripts()) {
      const relative = path.relative(root, full)
      scanned.push(relative)
      const offending = find_unguarded_work(fs.readFileSync(full, 'utf8'))
      if (offending.length)
        unguarded.push(`${relative}\n    ${offending.join('\n    ')}`)
    }
    // Control: the walk must reach known scripts, or an empty list proves
    // nothing.
    expect(scanned).to.include.members([
      'cli/index.mjs',
      'scripts/import-uptime.mjs',
      'scripts/task-board.mjs'
    ])
    expect(scanned.length).to.be.at.least(30)
    if (unguarded.length)
      throw new Error(
        'move the work into main() and call it inside ' +
          '`if (isMain(import.meta.url)) { ... }`:\n' +
          unguarded.join('\n')
      )
  })

  it('flags each unguarded shape and passes the guarded one', () => {
    const guarded = `import debug from 'debug'
import { isMain } from '#common'
dayjs.extend(utc)
useWebSocketImplementation(WebSocket)
const log = debug('script')
export async function main() {}
if (isMain(import.meta.url)) {
  debug.enable('script')
  main().catch(() => process.exit(1))
}`
    expect(find_unguarded_work(guarded)).to.deep.equal([])
    for (const shape of [
      'async function main() {}\nmain().catch(() => {})',
      'function run() {}\nrun()',
      '(async () => {})()',
      'const rows = await fetch("x")',
      'for await (const x of y) {}',
      'console.log("report")',
      'dayjs.extend(await load())',
      "debug.enable('script')",
      'if (import.meta.main) { main() }',
      'if (isMain(import.meta.url)) { main() } else { other() }',
      'async function main() {}\nconst done = main()',
      'export const done = (async () => {})()',
      'try { work() } catch {}'
    ]) {
      expect({
        shape,
        offending: find_unguarded_work(shape).length
      }).to.deep.equal({
        shape,
        offending: 1
      })
    }
  })
})

describe('isMain', () => {
  const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'entry-')))
  const script = path.join(dir, 'script.mjs')
  fs.writeFileSync(script, '')
  const link = path.join(dir, 'link.mjs')
  fs.symlinkSync(script, link)
  const with_argv = (invoked, module_path = script) => {
    const saved = process.argv[1]
    process.argv[1] = invoked
    try {
      return isMain(pathToFileURL(module_path).href)
    } finally {
      process.argv[1] = saved
    }
  }

  it('is true when the module is the invoked script', () => {
    expect(with_argv(script)).to.equal(true)
  })

  it('is true for a relative or symlinked invocation', () => {
    expect(with_argv(path.relative(process.cwd(), script))).to.equal(true)
    expect(with_argv(link)).to.equal(true)
    expect(with_argv(script, link)).to.equal(true)
  })

  it('is false when another script was invoked or argv is empty', () => {
    expect(with_argv(fileURLToPath(import.meta.url))).to.equal(false)
    expect(with_argv(path.join(dir, 'missing.mjs'))).to.equal(false)
    expect(with_argv(undefined)).to.equal(false)
  })
})
