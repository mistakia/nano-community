import { all } from 'redux-saga/effects'

import { appSagas } from './app'
import { docSagas } from './docs'
import { networkSagas } from './network'
import { postlistSagas } from './postlists'

export default function* rootSage() {
  yield all([...appSagas, ...docSagas, ...networkSagas, ...postlistSagas])
}
