import { combineReducers } from 'redux-immutable'
import { connectRouter } from 'connected-react-router/immutable'

import { appReducer } from './app'
import { accountsReducer } from './accounts'
import { blocksReducer } from './blocks'
import { docsReducer } from './docs'
import { githubDiscussionsReducer } from './github-discussions'
import { githubEventsReducer } from './github-events'
import { githubIssuesReducer } from './github-issues'
import { ledgerReducer } from './ledger'
import { networkReducer } from './network'
import { notificationReducer } from './notifications'
import { postsReducer } from './posts'
import { postlistsReducer } from './postlists'
import { nanodb_reducer } from './nanodb'
import { api_reducer } from './api'

const rootReducer = (history) =>
  combineReducers({
    router: connectRouter(history),
    app: appReducer,
    blocks: blocksReducer,
    accounts: accountsReducer,
    docs: docsReducer,
    githubDiscussions: githubDiscussionsReducer,
    githubEvents: githubEventsReducer,
    githubIssues: githubIssuesReducer,
    ledger: ledgerReducer,
    network: networkReducer,
    notification: notificationReducer,
    posts: postsReducer,
    postlists: postlistsReducer,
    nanodb: nanodb_reducer,
    api: api_reducer
  })

export default rootReducer
