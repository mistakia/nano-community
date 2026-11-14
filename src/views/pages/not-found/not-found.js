import React from 'react'

import PageNavigation from '@components/page-navigation'

import './not-found.styl'

export default class NotFoundPage extends React.Component {
  render() {
    return (
      <div className='doc__container'>
        <div className='main__content' />
        <PageNavigation />
      </div>
    )
  }
}
