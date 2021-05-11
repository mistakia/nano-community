// Needed for redux-saga es6 generator support
import '@babel/polyfill'

import React from 'react'
import { hydrate, render } from 'react-dom'

import Root from '@views/root'

document.addEventListener('DOMContentLoaded', () => {
  const rootElement = document.getElementById('app')
  if (rootElement.hasChildNodes()) {
    hydrate(<Root />, rootElement)
  } else {
    render(<Root />, rootElement)
  }
})
