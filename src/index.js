// Needed for redux-saga es6 generator support
import '@babel/polyfill'

import React from 'react'
import { render } from 'react-dom'

import Root from '@views/root'

document.addEventListener('DOMContentLoaded', () => {
  const rootElement = document.getElementById('app')
  render(<Root />, rootElement)
})
