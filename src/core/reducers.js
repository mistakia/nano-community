import { combineReducers } from 'redux-immutable'
import { connectRouter } from 'connected-react-router/immutable'

import { appReducer } from './app'
import { docsReducer } from './docs'
import { githubReducer } from './github'
import { networkReducer } from './network'
import { notificationReducer } from './notifications'
import { postsReducer } from './posts'
import { postlistsReducer } from './postlists'

const rootReducer = (history) =>
  combineReducers({
    router: connectRouter(history),
    app: appReducer,
    docs: docsReducer,
    github: githubReducer,
    network: networkReducer,
    notification: notificationReducer,
    posts: postsReducer,
    postlists: postlistsReducer
  })

export default rootReducer
