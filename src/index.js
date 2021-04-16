// Needed for redux-saga es6 generator support
import '@babel/polyfill'

import React from 'react'
import ReactDOM from 'react-dom'

import Root from '@views/root'

document.addEventListener('DOMContentLoaded', () => {
  ReactDOM.render(<Root />, document.getElementById('app'))
})
