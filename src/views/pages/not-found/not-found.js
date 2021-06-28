import React from 'react'
import Helmet from 'react-helmet'

import Menu from '@components/menu'

import './not-found.styl'

export default class NotFoundPage extends React.Component {
  render() {
    return (
      <div className='doc__container'>
        <Helmet title='404' />
        <div className='main__content'>
          <h1>404</h1>
          <p>Page not found</p>
        </div>
        <Menu />
      </div>
    )
  }
}
