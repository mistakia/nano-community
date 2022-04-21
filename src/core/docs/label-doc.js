import { Record, Map } from 'immutable'

export const LabelDoc = new Record({
  isPending: true,
  isLoaded: false,
  content: null,
  commit: new Map(),
  authors: new Map()
})
