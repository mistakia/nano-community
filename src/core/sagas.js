import { all } from 'redux-saga/effects'

import { appSagas } from './app'

export default function* rootSage() {
  yield all([...appSagas])
}
