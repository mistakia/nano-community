import React from 'react'
import PropTypes from 'prop-types'
import ClearIcon from '@material-ui/icons/Clear'

import { debounce } from '@core/utils'

import './representatives-search.styl'

export default class RepresentativesSearch extends React.Component {
  constructor(props) {
    super(props)

    this.state = {
      value: this.props.value || ''
    }

    this.search = debounce((value) => {
      this.props.search(value)
    }, 300)
  }

  handleClick = () => {
    const value = ''
    this.setState({ value })
    this.props.search(value)
  }

  handleChange = (event) => {
    const { value } = event.target
    this.setState({ value })
    this.search(value)
  }

  render = () => {
    return (
      <div className='representatives__search'>
        <input
          className='representatives__search-input'
          type='text'
          placeholder='Filter by account, alias, ip'
          value={this.state.value}
          onChange={this.handleChange}
        />
        {this.state.value && (
          <div
            className='representatives__search-clear'
            onClick={this.handleClick}>
            <ClearIcon />
          </div>
        )}
      </div>
    )
  }
}

RepresentativesSearch.propTypes = {
  value: PropTypes.string,
  search: PropTypes.func
}
