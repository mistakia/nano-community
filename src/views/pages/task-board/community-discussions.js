import React, { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { List } from 'immutable'

import Discussion from '@components/github-discussion'
import {
  GithubDiscussion,
  getGithubDiscussionsState,
  githubDiscussionsActions
} from '@core/github-discussions'

const SKELETON_COUNT = 3
const SHOWN_COUNT = 5
const DISCUSSIONS_URL = 'https://github.com/mistakia/nano-community/discussions'

// The planning discussions the GitHub roadmap page showed beside its board.
export default function CommunityDiscussions() {
  const dispatch = useDispatch()
  const discussions_state = useSelector(getGithubDiscussionsState)
  useEffect(() => {
    dispatch(githubDiscussionsActions.getGithubDiscussions())
  }, [])

  const discussions = discussions_state.get('discussions')
  const is_pending = discussions_state.get('isPending')
  if (!is_pending && !discussions.size) return null
  const items = is_pending
    ? List(Array.from({ length: SKELETON_COUNT }, () => new GithubDiscussion()))
    : discussions
        .sortBy((item) => item.updated_at || item.created_at)
        .reverse()
        .take(SHOWN_COUNT)

  return (
    <div className='task-board__discussions'>
      <div className='header__container'>
        <div className='header__title'>
          <h1>Planning</h1>
          <span>Community discussions</span>
        </div>
      </div>
      <div className='task-board__discussions-body'>
        {items.map((item, key) => (
          <Discussion key={key} discussion={item} />
        ))}
        {!is_pending && discussions.size > SHOWN_COUNT && (
          <a
            className='task-board__discussions-more'
            href={DISCUSSIONS_URL}
            target='_blank'
            rel='noreferrer'>
            All {discussions.size} discussions on GitHub
          </a>
        )}
      </div>
    </div>
  )
}
