import { combineReducers } from 'redux-immutable'
import { connectRouter } from 'connected-react-router/immutable'

import { appReducer } from './app'
import { accountsReducer } from './accounts'
import { blocksReducer } from './blocks'
import { docsReducer } from './docs'
import { githubReducer } from './github'
import { ledgerReducer } from './ledger'
import { networkReducer } from './network'
import { notificationReducer } from './notifications'
import { postsReducer } from './posts'
import { postlistsReducer } from './postlists'

const rootReducer = (history) =>
  combineReducers({
    router: connectRouter(history),
    app: appReducer,
    blocks: blocksReducer,
    accounts: accountsReducer,
    docs: docsReducer,
    github: githubReducer,
    ledger: ledgerReducer,
    network: networkReducer,
    notification: notificationReducer,
    posts: postsReducer,
    postlists: postlistsReducer
  })

export default rootReducer
