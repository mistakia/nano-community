import React from 'react'
import { Provider } from 'react-redux'
import { HistoryRouter as Router } from 'redux-first-history/rr6'
import { ThemeProvider } from '@mui/material/styles'

import { store, history } from '@core/store'
import App from '@components/app'
import theme from './theme'

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

const Root = () => (
  <Provider store={store}>
    <ThemeProvider theme={theme}>
      <Router history={history}>
        <App />
      </Router>
    </ThemeProvider>
  </Provider>
)

export default Root
