import React from 'react'
import ClearIcon from '@material-ui/icons/Clear'
import SearchIcon from '@material-ui/icons/Search'

import history from '@core/history'

import './search-bar.styl'

const ACCOUNT_REGEX = /((nano|xrb)_)?[13][13-9a-km-uw-z]{59}/
const BLOCK_REGEX = /[0-9A-F]{64}/

export default class SearchBar extends React.Component {
  constructor(props) {
    super(props)

    this.state = {
      value: '',
      invalid: false
    }
  }

  handleClick = () => {
    const value = ''
    this.setState({ value })
  }

  handleChange = (event) => {
    const { value } = event.target
    this.setState({ value })
    if (ACCOUNT_REGEX.test(value) || BLOCK_REGEX.test(value)) {
      history.push(`/${value}`)
    } else {
      this.setState({ invalid: true })
    }
  }

  render() {
    const isFilled = Boolean(this.state.value)
    return (
      <div className={`search__bar ${this.state.invalid && 'invalid'}`}>
        <SearchIcon className='search__icon' />
        <input
          className={`search__input ${isFilled ? 'filled' : ''}`}
          type='text'
          placeholder='Search by Address / Block Hash'
          value={this.state.value}
          onChange={this.handleChange}
        />
        {this.state.value && (
          <div className='search__input-clear' onClick={this.handleClick}>
            <ClearIcon />
          </div>
        )}
      </div>
    )
  }
}
