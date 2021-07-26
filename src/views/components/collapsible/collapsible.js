import React from 'react'
import PropTypes from 'prop-types'
import Collapse from '@material-ui/core/Collapse'
import Button from '@material-ui/core/Button'
import ExpandMoreIcon from '@material-ui/icons/ExpandMore'
import ExpandLessIcon from '@material-ui/icons/ExpandLess'

import './collapsible.styl'

export default class Collapsible extends React.Component {
  constructor(props) {
    super(props)

    this.state = {
      expanded: false
    }
  }

  handleClick = () => this.setState({ expanded: !this.state.expanded })

  render() {
    const { title, children } = this.props
    return (
      <div className='collapsible'>
        <div className='collapsible__head'>
          <Button
            startIcon={
              this.state.expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />
            }
            onClick={this.handleClick}>
            {title}
          </Button>
        </div>
        <Collapse in={this.state.expanded}>{children}</Collapse>
      </div>
    )
  }
}

Collapsible.propTypes = {
  title: PropTypes.string,
  children: PropTypes.oneOfType([
    PropTypes.arrayOf(PropTypes.node),
    PropTypes.node
  ]).isRequired
}
