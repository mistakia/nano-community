import { Record, Map } from 'immutable'

export const Doc = new Record({
  isPending: true,
  isLoaded: false,
  content: null,
  commit: new Map()
})
