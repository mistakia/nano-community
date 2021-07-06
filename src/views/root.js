import React from 'react'
import { create } from 'jss'
import { Provider } from 'react-redux'
import { withRouter } from 'react-router'
import { ConnectedRouter } from 'connected-react-router/immutable'
import {
  createMuiTheme,
  createGenerateClassName,
  StylesProvider,
  ThemeProvider,
  jssPreset
} from '@material-ui/core/styles'

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

const theme = createMuiTheme({
  overrides: {
    MuiButton: {
      root: {
        fontFamily: "'IBM Plex Mono', monospace",
        '&:hover': {
          color: '#4A90E2',
          backgroundColor: '#ffffff',
          boxShadow: '#D0D0D0 4px 4px 0px 0px'
        }
      }
    },
    MuiTooltip: {
      tooltip: {
        color: 'black',
        backgroundColor: '#ffffff',
        fontSize: 12,
        border: '1px solid rgba(0, 0, 0, 0.23)',
        boxShadow: '#D0D0D0 4px 4px 0px 0px'
      }
    }
  }
})

const initialState = window.__INITIAL_STATE__
const store = createStore(history, initialState)
const ConnectedApp = withRouter(App)
const jss = create({ plugins: [...jssPreset().plugins] })
const generateClassName = createGenerateClassName({
  productionPrefix: navigator.userAgent === 'ReactSnap' ? 'snap' : 'jss'
})

const Root = () => (
  <Provider store={store}>
    <StylesProvider jss={jss} generateClassName={generateClassName}>
      <ThemeProvider theme={theme}>
        <ConnectedRouter history={history}>
          <ConnectedApp />
        </ConnectedRouter>
      </ThemeProvider>
    </StylesProvider>
  </Provider>
)

export default Root
