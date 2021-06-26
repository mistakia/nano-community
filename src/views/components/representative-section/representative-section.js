import React from 'react'
import PropTypes from 'prop-types'

import './representative-section.styl'

export default class RepresentativeSection extends React.Component {
  render() {
    const { title, body } = this.props

    return <div className='representative__section'>{body}</div>
  }
}

RepresentativeSection.propTypes = {
  title: PropTypes.string,
  body: PropTypes.oneOfType([PropTypes.element, PropTypes.array])
}
