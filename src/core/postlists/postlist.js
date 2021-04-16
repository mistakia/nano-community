import { List, Record } from 'immutable'

export const Postlist = new Record({
  isPending: true,
  postIds: new List()
})
