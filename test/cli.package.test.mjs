/* global describe it */
import chai from 'chai'
import { readFileSync } from 'fs'
import { builtinModules } from 'module'
import path from 'path'

const expect = chai.expect

// The published nano-community-cli installs nothing but itself: every import
// in the files it ships is a Node built-in or another shipped file.
describe('nano-community-cli package', () => {
  const manifest = JSON.parse(readFileSync('cli/package.json', 'utf8'))
  const shipped = new Set(manifest.files)

  it('declares no dependencies of any kind', () => {
    for (const field of [
      'dependencies',
      'optionalDependencies',
      'peerDependencies',
      'bundleDependencies',
      'bundledDependencies'
    ]) {
      expect(manifest, field).to.not.have.property(field)
    }
    expect(manifest.scripts ?? {}).to.not.have.any.keys(
      'preinstall',
      'install',
      'postinstall',
      'prepare'
    )
  })

  it('ships every file its bin imports and imports only built-ins', () => {
    const builtins = new Set(builtinModules)
    const pending = [manifest.bin['nano-community']]
    const seen = new Set()
    while (pending.length) {
      const file = path.posix.normalize(pending.pop())
      if (seen.has(file)) continue
      seen.add(file)
      expect(shipped.has(file), `${file} is in files`).to.equal(true)
      // Comments hold usage examples, not imports
      const source = readFileSync(path.join('cli', file), 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/^\s*\/\/.*$/gm, '')
      // Static, side-effect and dynamic imports, and require calls
      for (const [, specifier] of source.matchAll(
        /(?:^\s*(?:import|export)\s[^'"]*?from\s*|^\s*import\s*|\bimport\s*\(\s*|\brequire\s*\(\s*)['"]([^'"]+)['"]/gm
      )) {
        if (specifier.startsWith('.')) {
          pending.push(path.posix.join(path.posix.dirname(file), specifier))
        } else {
          expect(
            builtins.has(specifier.replace(/^node:/, '')),
            `${file} imports ${specifier}`
          ).to.equal(true)
        }
      }
    }
    expect([...shipped].sort()).to.deep.equal([...seen].sort())
  })
})
