import React from 'react'
import PropTypes from 'prop-types'
import Collapse from '@mui/material/Collapse'
import Button from '@mui/material/Button'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'

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
    const { title, children, only_render_when_visible = false } = this.props
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
        <Collapse in={this.state.expanded}>
          {only_render_when_visible
            ? this.state.expanded
              ? children
              : null
            : children}
        </Collapse>
      </div>
    )
  }
}

Collapsible.propTypes = {
  title: PropTypes.string,
  children: PropTypes.oneOfType([
    PropTypes.arrayOf(PropTypes.node),
    PropTypes.node
  ]).isRequired,
  only_render_when_visible: PropTypes.bool
}
