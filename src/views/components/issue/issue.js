import React from 'react'
import * as timeago from 'timeago.js'
import ImmutablePropTypes from 'react-immutable-proptypes'
import PropTypes from 'prop-types'
import Skeleton from '@material-ui/lab/Skeleton'
import Chip from '@material-ui/core/Chip'

import './issue.styl'

function Label({ label }) {
  return (
    <Chip
      className='issue__label'
      label={label.label_name}
      size='small'
      style={{ backgroundColor: `#${label.label_color}` }}
    />
  )
}

Label.propTypes = {
  label: PropTypes.object
}

function Labels({ labels }) {
  if (!labels.size) {
    return null
  }

  const items = labels.map((item, key) => <Label key={key} label={item} />)

  return <div className='issue__labels'>{items}</div>
}

Labels.propTypes = {
  labels: ImmutablePropTypes.list
}

export default class Issue extends React.Component {
  render() {
    const { issue } = this.props

    if (!issue.id) {
      return (
        <div className='issue'>
          <div className='issue__title'>
            <Skeleton height={30} />
          </div>
          <div className='issue__meta'>
            <Skeleton animation='wave' width={200} />
          </div>
        </div>
      )
    }

    return (
      <div className='issue'>
        <a
          className='issue__title'
          href={issue.url}
          rel='noreferrer'
          target='_blank'>
          {issue.title}
        </a>
        <div className='issue__meta'>
          <div>
            {issue.repo}#{issue.ref}
          </div>
          <div>{issue.actor_name}</div>
          <div>{timeago.format(issue.created_at * 1000)}</div>
        </div>
        <Labels labels={issue.labels} />
      </div>
    )
  }
}

Issue.propTypes = {
  issue: ImmutablePropTypes.record
}
