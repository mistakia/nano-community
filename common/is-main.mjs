import { realpathSync } from 'fs'
import { fileURLToPath } from 'url'

// True when the module at import_meta_url is the script node was invoked on.
// Both sides resolve symlinks, so a relative, symlinked or npm-bin invocation
// still counts as main.
export const isMain = (import_meta_url) => {
  if (!process.argv[1]) return false
  try {
    return (
      realpathSync(process.argv[1]) ===
      realpathSync(fileURLToPath(import_meta_url))
    )
  } catch {
    return false
  }
}
