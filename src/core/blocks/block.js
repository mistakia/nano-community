import { Record, Map } from 'immutable'

export const Block = new Record({
  isLoading: true,
  blockInfo: new Map(),
  linkAccountAlias: null,
  blockAccountAlias: null
})
