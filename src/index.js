// Needed for redux-saga es6 generator support
import '@babel/polyfill'

import React from 'react'
import ReactDOM from 'react-dom'
// import { Provider } from 'react-redux'
// import { ConnectedRouter } from 'connected-react-router'

// Import root app
// import App from 'components/App';

// Import Language Provider
// import LanguageProvider from 'containers/LanguageProvider';

// Load the favicon and the .htaccess file
// import '!file-loader?name=[name].[ext]!./images/favicon.ico';
// import 'file-loader?name=.htaccess!./.htaccess'; // eslint-disable-line import/extensions

// import configureStore from './configureStore';

// Import i18n messages
// import { translationMessages } from './i18n';

// Observe loading of Open Sans (to remove open sans, remove the <link> tag in
// the index.html file and this observer)
// const openSansObserver = new FontFaceObserver('Open Sans', {});

// When Open Sans is loaded, add a font-family using Open Sans to the body
/* openSansObserver.load().then(() => {
 *   document.body.classList.add('fontLoaded');
 * });
 *  */

// Create redux store with history
// const initialState = {};
// const store = configureStore(initialState, history);

document.addEventListener('DOMContentLoaded', () =>
  ReactDOM.render(
    <div>
      <h1>Nano Wiki</h1>
    </div>,
    document.getElementById('app')
  )
)
