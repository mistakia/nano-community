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

const sort_labels = (a, b) => {
  const order = ['status/', 'priority/', 'bounty', 'kind/', 'topic/']
  const get_order_index = (label) => {
    const index = order.findIndex((prefix) =>
      label.label_name.startsWith(prefix)
    )
    return index === -1 ? order.length : index // put labels that don't match at the end
  }

  const a_index = get_order_index(a)
  const b_index = get_order_index(b)

  if (a_index !== b_index) {
    return a_index - b_index
  }

  // If the same category, sort alphabetically
  return a.label_name.localeCompare(b.label_name)
}

export default function GithubLabels({ labels }) {
  if (!labels.size) {
    return null
  }

  const sorted_labels = labels.sort(sort_labels)

  const items = sorted_labels.map((item, key) => (
    <GithubLabel key={key} label={item} />
  ))
  return <div className='github__labels'>{items}</div>
}

GithubLabels.propTypes = {
  labels: ImmutablePropTypes.list
}
