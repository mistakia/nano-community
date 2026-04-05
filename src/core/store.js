import { fromJS } from 'immutable'
import { applyMiddleware, compose, createStore } from 'redux'
import { createReduxHistoryContext } from 'redux-first-history'
import createSagaMiddleware, { END } from 'redux-saga'
import { createBrowserHistory } from 'history'

import rootSaga from './sagas'
import rootReducer from './reducers'

const sagaMiddleware = createSagaMiddleware()

const { createReduxHistory, routerMiddleware, routerReducer } =
  createReduxHistoryContext({
    history: createBrowserHistory(),
    selectRouterState: (state) => state.get('router')
  })

const composeEnhancers = window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose

// ======================================================
// Middleware Configuration
// ======================================================
const middlewares = [sagaMiddleware, routerMiddleware]

// ======================================================
// Store Enhancers
// ======================================================
const enhancers = [applyMiddleware(...middlewares)]

// ======================================================
// Store Instantiation and HMR Setup
// ======================================================
export const store = createStore(
  rootReducer(routerReducer),
  fromJS({}),
  composeEnhancers(...enhancers)
)

sagaMiddleware.run(rootSaga)
store.close = () => store.dispatch(END)

if (module.hot) {
  // Enable webpack hot module replacement for reducers
  module.hot.accept('./reducers', () => {
    const nextReducers = rootReducer(routerReducer)
    store.replaceReducer(nextReducers)
  })
}

export const history = createReduxHistory(store)
