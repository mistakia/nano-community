import { combineReducers } from 'redux-immutable'
import { connectRouter } from 'connected-react-router/immutable'

import { postsReducer } from './posts'
import { postlistsReducer } from './postlists'

const rootReducer = (history) =>
  combineReducers({
    router: connectRouter(history),
    posts: postsReducer,
    postlists: postlistsReducer
  })

export default rootReducer
