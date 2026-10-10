// Standalone task board client: the board and task views with no
// nano.community navigation and no /api calls, built into one self-contained
// index.html that runs from any static host, an nsite, or file://. Routing
// uses the URL fragment: #/ for the board, #/task/<issue id> for a task, with
// optional ?board=<owner npub>&relays=<wss urls> after either.

import React, { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider, useDispatch } from 'react-redux'
import { createStore, applyMiddleware } from 'redux'
import { combineReducers } from 'redux-immutable'
import createSagaMiddleware from 'redux-saga'
import { all } from 'redux-saga/effects'

import {
  task_board_reducer,
  task_board_sagas,
  task_board_actions,
  resolve_board_config
} from '@core/task-board'
import {
  nostr_identity_reducer,
  nostr_identity_sagas,
  nostr_identity_actions
} from '@core/nostr-identity'
import {
  TaskBoard,
  TaskDetail,
  TaskBoardLinks,
  AnchorLink
} from '@components/task-board'

import './task-board-client.styl'

const saga_middleware = createSagaMiddleware()
const store = createStore(
  combineReducers({
    task_board: task_board_reducer,
    nostr_identity: nostr_identity_reducer
  }),
  applyMiddleware(saga_middleware)
)
saga_middleware.run(function* () {
  yield all([...task_board_sagas, ...nostr_identity_sagas])
})

const parse_route = () => {
  const [path, query = ''] = window.location.hash.replace(/^#/, '').split('?')
  const task_match = path.match(/^\/task\/([0-9a-f]{64})$/)
  return { issue_id: task_match ? task_match[1] : null, query }
}

function App() {
  const dispatch = useDispatch()
  const [route, set_route] = useState(parse_route)

  useEffect(() => {
    dispatch(task_board_actions.init(resolve_board_config()))
    dispatch(nostr_identity_actions.init())
    const on_hash_change = () => {
      set_route(parse_route())
      window.scrollTo(0, 0)
    }
    window.addEventListener('hashchange', on_hash_change)
    return () => window.removeEventListener('hashchange', on_hash_change)
  }, [])

  const suffix = route.query ? `?${route.query}` : ''
  const links = {
    task_path: (issue_id) => `#/task/${issue_id}${suffix}`,
    board_path: () => `#/${suffix}`,
    navigate: (path) => {
      window.location.hash = path.replace(/^#/, '')
    },
    Link: AnchorLink
  }

  return (
    <TaskBoardLinks.Provider value={links}>
      {route.issue_id ? (
        <TaskDetail issue_id={route.issue_id} />
      ) : (
        <TaskBoard />
      )}
    </TaskBoardLinks.Provider>
  )
}

createRoot(document.getElementById('app')).render(
  <Provider store={store}>
    <App />
  </Provider>
)
