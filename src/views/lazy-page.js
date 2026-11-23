import React, { lazy } from 'react'
import PropTypes from 'prop-types'

// Set for the reload a failed chunk load triggers, and cleared once a page
// chunk loads, so a chunk that keeps failing reloads once and then shows an
// error instead of looping.
const CHUNK_RELOAD_FLAG = 'chunk_load_reload'

const read_reload_flag = () => {
  try {
    return window.sessionStorage.getItem(CHUNK_RELOAD_FLAG) === 'true'
  } catch {
    return false
  }
}

const write_reload_flag = (value) => {
  try {
    if (value) window.sessionStorage.setItem(CHUNK_RELOAD_FLAG, 'true')
    else window.sessionStorage.removeItem(CHUNK_RELOAD_FLAG)
  } catch {}
}

const is_chunk_load_error = (error) =>
  Boolean(
    error &&
    (error.name === 'ChunkLoadError' || error.code === 'CSS_CHUNK_LOAD_FAILED')
  )

// A route page that loads its own chunk. preload() resolves the chunk before
// the first render, so the initial render never suspends and never blanks the
// prerendered DOM; later client-side navigations fall back to Suspense.
export default function lazy_page(import_page) {
  let Loaded = null
  let promise = null
  const preload = () => {
    if (!promise)
      promise = import_page().then((module) => {
        Loaded = module.default
        write_reload_flag(false)
        return module
      })
    return promise
  }
  const Lazy = lazy(preload)
  function Page(props) {
    return Loaded ? <Loaded {...props} /> : <Lazy {...props} />
  }
  Page.preload = preload
  return Page
}

// Catches a failed page chunk load (a network flake, or a tab left open past
// the deploy's asset retention) and reloads once; a second failure in the
// same session shows a message instead of a blank page. Other errors pass on.
export class ChunkLoadBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { error: null, reloading: false }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error) {
    if (!is_chunk_load_error(error) || read_reload_flag()) return
    write_reload_flag(true)
    this.setState({ reloading: true })
    window.location.reload()
  }

  render() {
    const { error, reloading } = this.state
    if (!error) return this.props.children
    if (!is_chunk_load_error(error)) throw error
    if (reloading) return null
    return (
      <div className='chunk-load-error' role='alert'>
        This page failed to load. Check your connection and reload the page.
      </div>
    )
  }
}

ChunkLoadBoundary.propTypes = {
  children: PropTypes.node
}
