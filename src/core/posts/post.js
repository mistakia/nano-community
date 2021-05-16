import { Record, List } from 'immutable'

export const Post = new Record({
  id: null,
  pid: null,
  sid: null,
  author: null,
  authorid: null,
  title: null,
  text: null,
  html: null,
  summary: null,
  score: null,
  score_social: null,
  created_at: null,
  updated_at: null,
  tags: new List(),

  source_title: null,
  source_url: null,
  strength: null,
  main_url: null
})
