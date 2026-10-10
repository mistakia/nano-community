import { combineReducers } from 'redux-immutable'

import { appReducer } from './app'
import { accounts_reducer } from './accounts'
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
import { data_views_reducer } from './data-views'
import { data_view_request_reducer } from './data-view-request/reducer'
import { nostr_identity_reducer } from './nostr-identity'
import { task_board_reducer } from './task-board'

const rootReducer = (router) =>
  combineReducers({
    router,
    app: appReducer,
    blocks: blocksReducer,
    accounts: accounts_reducer,
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
    api: api_reducer,
    data_views: data_views_reducer,
    data_view_request: data_view_request_reducer,
    nostr_identity: nostr_identity_reducer,
    task_board: task_board_reducer
  })

export default rootReducer
