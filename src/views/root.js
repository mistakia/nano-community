import React from 'react'
import { Provider } from 'react-redux'
import { withRouter } from 'react-router'
import { ConnectedRouter } from 'connected-react-router/immutable'

import createStore from '@core/store'
import history from '@core/history'
import App from '@components/app'

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

const initialState = window.__INITIAL_STATE__
const store = createStore(history, initialState)
const ConnectedApp = withRouter(App)

const Root = () => (
  <Provider store={store}>
    <ConnectedRouter history={history}>
      <ConnectedApp />
    </ConnectedRouter>
  </Provider>
)

export default Root
