import React from 'react'
import { create } from 'jss'
import { Provider } from 'react-redux'
import { withRouter } from 'react-router'
import { ConnectedRouter } from 'connected-react-router/immutable'
import { createGenerateClassName, StylesProvider, jssPreset } from '@mui/styles'
import { createTheme, ThemeProvider } from '@mui/material/styles'

import createStore from '@core/store'
import history from '@core/history'
import App from '@components/app'

// Load the favicon and the .htaccess file
// import '!file-loader?name=[name].[ext]!./images/favicon.ico';
// import 'file-loader?name=.htaccess!./.htaccess'; // eslint-disable-line import/extensions

// import configureStore from './configureStore';

// Observe loading of Open Sans (to remove open sans, remove the <link> tag in
// the index.html file and this observer)
// const openSansObserver = new FontFaceObserver('Open Sans', {});

// When Open Sans is loaded, add a font-family using Open Sans to the body
/* openSansObserver.load().then(() => {
 *   document.body.classList.add('fontLoaded');
 * });
 *  */

const theme = createTheme({
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          fontFamily: "'IBM Plex Mono', monospace",
          border: '1px solid rgba(0, 0, 0, 0.23)',
          color: 'rgba(0, 0, 0, 0.87)',
          '&:hover': {
            color: '#4A90E2',
            backgroundColor: '#ffffff',
            border: '1px solid rgba(0, 0, 0, 0.23)',
            boxShadow: '#D0D0D0 4px 4px 0px 0px'
          }
        }
      }
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          color: 'black',
          backgroundColor: '#ffffff',
          fontSize: 12,
          lineHeight: '18px',
          border: '1px solid rgba(0, 0, 0, 0.23)',
          boxShadow: '#D0D0D0 4px 4px 0px 0px'
        }
      }
    },
    MuiAvatarGroup: {
      styleOverrides: {
        root: {
          flexDirection: 'row'
        }
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
    <StylesProvider jss={jss} generateClassName={generateClassName} injectFirst>
      <ThemeProvider theme={theme}>
        <ConnectedRouter history={history}>
          <ConnectedApp />
        </ConnectedRouter>
      </ThemeProvider>
    </StylesProvider>
  </Provider>
)

export default Root
