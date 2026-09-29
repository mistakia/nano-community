import React, { useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'

import Post from '@components/post'
import { Post as PostRecord } from '@core/posts'

import '@components/posts/posts.styl'
import './community-feed.styl'

export const feed_tabs = [
  { id: 'top', label: 'Top', age: 168 },
  { id: 'trending', label: 'Trending', age: 72 },
  { id: 'announcements', label: 'Nano Foundation', age: 336 }
]

const skeletons = [new PostRecord(), new PostRecord(), new PostRecord()]

export default function CommunityFeed({ lists, getPosts }) {
  const [selected_id, set_selected_id] = useState('top')
  const [top_age, set_top_age] = useState(168)

  useEffect(() => {
    feed_tabs.forEach(({ id, age }) => getPosts(id, { age }))
  }, [])

  const handle_top_age_change = (event, age) => {
    if (!age) return
    set_top_age(age)
    getPosts('top', { age })
  }

  // hide a tab once its list has loaded empty
  const visible_tabs = feed_tabs.filter(
    ({ id }) => lists[id].is_pending || lists[id].posts.size
  )
  if (!visible_tabs.length) {
    return null
  }

  const selected =
    visible_tabs.find(({ id }) => id === selected_id) || visible_tabs[0]
  const { posts, is_pending } = lists[selected.id]
  const items = posts.size ? posts : is_pending ? skeletons : []

  return (
    <div className='posts__container community-feed'>
      <div className='header__container'>
        <div className='community-feed__tabs'>
          {visible_tabs.map(({ id, label }) => (
            <button
              key={id}
              type='button'
              className={`community-feed__tab ${
                id === selected.id ? 'selected' : ''
              }`}
              onClick={() => set_selected_id(id)}>
              {label}
            </button>
          ))}
        </div>
        {selected.id === 'top' && (
          <ToggleButtonGroup
            value={top_age}
            exclusive
            onChange={handle_top_age_change}
            aria-label='age'
            className='toggle-button-group'>
            <ToggleButton value={72}>3D</ToggleButton>
            <ToggleButton value={168}>7D</ToggleButton>
            <ToggleButton value={720}>1M</ToggleButton>
          </ToggleButtonGroup>
        )}
      </div>
      <div className='posts__body'>
        {items.map((post, index) => (
          <Post key={index} post={post} />
        ))}
      </div>
    </div>
  )
}

CommunityFeed.propTypes = {
  lists: PropTypes.object,
  getPosts: PropTypes.func
}
