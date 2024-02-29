import React from 'react'
import PropTypes from 'prop-types'
import ImmutablePropTypes from 'react-immutable-proptypes'

import Chip from '@mui/material/Chip'

import './github-labels.styl'

function GithubLabel({ label }) {
  return (
    <Chip
      className='github__label'
      label={label.label_name}
      size='small'
      style={{ backgroundColor: `#${label.label_color}` }}
    />
  )
}

GithubLabel.propTypes = {
  label: PropTypes.object
}

export default class GithubLabels extends React.Component {
  render() {
    const { labels } = this.props

    if (!labels.size) {
      return null
    }

    const items = labels.map((item, key) => (
      <GithubLabel key={key} label={item} />
    ))
    return <div className='github__labels'>{items}</div>
  }
}

GithubLabels.propTypes = {
  labels: ImmutablePropTypes.list
}
