import { all } from 'redux-saga/effects'

import { appSagas } from './app'
import { postlistSagas } from './postlists'

export default function* rootSage() {
  yield all([...appSagas, ...postlistSagas])
}
