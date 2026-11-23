// Runs after react-snap in `yarn build`. Compresses every servable build file
// once (.br at quality 11, .gz at level 9) so the server never compresses per
// request, then fails the build when a page's HTML or JS outgrows its budget.
// No CI builds the client, so this check is the regression oracle for
// inlining drift and bundle growth. Prints the per-page table it checked.
import { promises as fs } from 'fs'
import path from 'path'
import zlib from 'zlib'
import { promisify } from 'util'

const brotli = promisify(zlib.brotliCompress)
const gzip = promisify(zlib.gzip)

// Brotli budgets from the first extracted-and-split builds (2026-11-23) plus
// 15%, within ceilings of 25 KB for HTML and 750 KB for JS. Data pages
// prerender live API data, so their HTML varies between builds: the largest
// HTML across two builds was 14.2 KB (/telemetry), and the largest page JS
// 665.6 KB (/telemetry), which the 750 KB ceiling caps.
const HTML_BUDGET_BYTES = 16.5 * 1024
const JS_BUDGET_BYTES = 750 * 1024

const COMPRESSIBLE_EXTENSIONS = new Set([
  '.html',
  '.js',
  '.css',
  '.svg',
  '.xml',
  '.txt',
  '.json'
])
const MIN_COMPRESS_BYTES = 1024

// Mirrors src/views/routes.js and src/views/pages/dynamic/index.js: the
// page chunk group each prerendered path loads. Doc pages are the default;
// 200.html is react-snap's unrendered shell and loads no page chunk.
const PAGE_CHUNK_GROUPS = [
  [/^\/200\.html$/, null],
  [/^\/$/, 'page-home'],
  [/^\/roadmap$/, 'page-task-board'],
  [/^\/roadmap\/account$/, 'page-task-account'],
  [/^\/roadmap\/new$/, 'page-task-new'],
  [/^\/task\/[^/]+$/, 'page-task'],
  [/^\/representatives$/, 'page-representatives'],
  [/^\/labels\/[^/]+$/, 'page-label'],
  [/^\/404\.html$/, 'page-not-found'],
  [/^\/ledger$/, 'page-ledger'],
  [/^\/telemetry$/, 'page-telemetry'],
  [/^\/network-events$/, 'page-network-events'],
  [/^\/live$/, 'page-live']
]

const build_path = path.resolve(process.argv[2] || 'build')

const list_files = async (directory) => {
  const entries = await fs.readdir(directory, { withFileTypes: true })
  const files = await Promise.all(
    entries.map((entry) => {
      const entry_path = path.join(directory, entry.name)
      return entry.isDirectory() ? list_files(entry_path) : [entry_path]
    })
  )
  return files.flat()
}

const page_path_of = (html_file) => {
  const relative = '/' + path.relative(build_path, html_file)
  if (relative === '/index.html') return '/'
  if (relative.endsWith('/index.html')) return relative.slice(0, -11)
  return relative
}

const chunk_group_of = (page_path) => {
  const match = PAGE_CHUNK_GROUPS.find(([pattern]) => pattern.test(page_path))
  return match ? match[1] : 'page-doc'
}

const script_sources = (html) =>
  [...html.matchAll(/<script\b[^>]*\bsrc="([^"]+)"/g)].map((m) => m[1])

const format_kb = (bytes) => (bytes / 1024).toFixed(1)

const main = async () => {
  const manifest_path = path.join(build_path, 'chunk-groups.json')
  const chunk_groups = JSON.parse(await fs.readFile(manifest_path, 'utf8'))
  await fs.rm(manifest_path)

  const files = (await list_files(build_path)).filter(
    (file) => !file.endsWith('.br') && !file.endsWith('.gz')
  )

  // Compress, remembering each file's brotli size for the budgets.
  const brotli_sizes = new Map()
  for (const file of files) {
    if (!COMPRESSIBLE_EXTENSIONS.has(path.extname(file))) continue
    const content = await fs.readFile(file)
    if (content.length <= MIN_COMPRESS_BYTES) {
      brotli_sizes.set(file, content.length)
      continue
    }
    const [br, gz] = await Promise.all([
      brotli(content, {
        params: {
          [zlib.constants.BROTLI_PARAM_QUALITY]: 11,
          [zlib.constants.BROTLI_PARAM_SIZE_HINT]: content.length
        }
      }),
      gzip(content, { level: 9 })
    ])
    await fs.writeFile(`${file}.br`, br)
    await fs.writeFile(`${file}.gz`, gz)
    brotli_sizes.set(file, br.length)
  }

  const js_size_of = (url) => {
    const file = path.join(build_path, url)
    return brotli_sizes.get(file) || 0
  }

  const rows = []
  for (const file of files.filter((f) => f.endsWith('.html')).sort()) {
    const html = await fs.readFile(file, 'utf8')
    const page_path = page_path_of(file)
    const html_bytes = brotli_sizes.get(file)
    const group = chunk_group_of(page_path)
    const scripts = new Set(
      script_sources(html).filter((src) => src.startsWith('/'))
    )
    for (const chunk of chunk_groups[group] || []) scripts.add(`/${chunk}`)
    const js_bytes = [...scripts].reduce((sum, src) => sum + js_size_of(src), 0)
    const inline_scripts = (html.match(/<script(?![^>]*\bsrc=)[^>]*>/g) || [])
      .length
    rows.push({
      page_path,
      group: group || 'none',
      html_bytes,
      js_bytes,
      inline_scripts
    })
  }

  const failures = rows.filter(
    (row) =>
      row.html_bytes > HTML_BUDGET_BYTES || row.js_bytes > JS_BUDGET_BYTES
  )

  console.log(
    `HTML budget ${format_kb(HTML_BUDGET_BYTES)} KB br, JS budget ${format_kb(JS_BUDGET_BYTES)} KB br`
  )
  console.log(
    ['page', 'chunk group', 'html br KB', 'js br KB', 'inline scripts'].join(
      '\t'
    )
  )
  for (const row of rows) {
    const flag = failures.includes(row) ? '\tOVER BUDGET' : ''
    console.log(
      [
        row.page_path,
        row.group,
        format_kb(row.html_bytes),
        format_kb(row.js_bytes),
        row.inline_scripts
      ].join('\t') + flag
    )
  }

  if (!chunk_groups['page-home'] || !chunk_groups['page-doc']) {
    console.error('chunk-groups.json lacks the page-home or page-doc group')
    process.exit(1)
  }
  if (failures.length) {
    console.error(`${failures.length} page(s) over budget`)
    process.exit(1)
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
