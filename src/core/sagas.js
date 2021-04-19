import { all } from 'redux-saga/effects'

import { appSagas } from './app'
import { docSagas } from './docs'
import { postlistSagas } from './postlists'

export default function* rootSage() {
  yield all([...appSagas, ...docSagas, ...postlistSagas])
}
