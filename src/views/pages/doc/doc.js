import React from 'react'
import PropTypes from 'prop-types'
import marked from 'marked'
import Skeleton from '@material-ui/lab/Skeleton'
import ImmutablePropTypes from 'react-immutable-proptypes'

import Menu from '@components/menu'

import './doc.styl'

export default class DocPage extends React.Component {
  componentDidMount() {
    this.props.getDoc(this.props.location.pathname)
  }

  render() {
    const { doc } = this.props

    let body
    if (doc.isPending) {
      body = (
        <div className='doc__content'>
          <Skeleton height={80} width={200} />
          <Skeleton height={20} />
          <Skeleton height={20} animation={false} />
          <Skeleton height={20} animation='wave' />
          <Skeleton height={20} />
          <Skeleton height={30} width={300} style={{ marginTop: '32px' }} />
          <Skeleton height={20} animation={false} />
          <Skeleton height={20} animation='wave' />
          <Skeleton height={20} />
          <Skeleton height={20} animation={false} />
          <Skeleton height={20} animation='wave' />
        </div>
      )
    } else if (doc.isLoaded && !doc.content) {
      body = (
        <div className='doc__content'>
          <h1>404</h1>
          <p>Document not found</p>
        </div>
      )
    } else {
      const html = marked(doc.content)
      body = (
        <div
          className='doc__content'
          dangerouslySetInnerHTML={{ __html: html }}></div>
      )
    }

    return (
      <>
        {body}
        <Menu />
      </>
    )
  }
}

DocPage.propTypes = {
  getDoc: PropTypes.func,
  location: PropTypes.object,
  doc: ImmutablePropTypes.record
}
