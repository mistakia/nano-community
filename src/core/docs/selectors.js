import { Doc } from './doc'

export function getDocs(state) {
  return state.get('docs')
}

export function getDocById(state, { location }) {
  const id = location.pathname
  return getDocs(state).get(id, new Doc())
}
