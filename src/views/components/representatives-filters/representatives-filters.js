import React from 'react'
import PropTypes from 'prop-types'
import ClearIcon from '@material-ui/icons/Clear'

import './representatives-filters.styl'

export default class RepresentativesFilters extends React.Component {
  handleClick = () => {
    // clear filters
    this.props.filter()
  }

  render() {
    if (!this.props.field) {
      return null
    }

    return (
      <div className='representatives__filters' onClick={this.handleClick}>
        <ClearIcon />
        <div>Clear filters</div>
      </div>
    )
  }
}

RepresentativesFilters.propTypes = {
  filter: PropTypes.func,
  field: PropTypes.string
}
