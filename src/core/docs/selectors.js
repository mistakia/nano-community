import { Doc } from './doc'

export function getDocs(state) {
  return state.get('docs')
}

export function getDocById(state, { location }) {
  const path = location.pathname
  const id = path.endsWith('/') ? path.slice(0, -1) : path
  return getDocs(state).get(id, new Doc())
}
