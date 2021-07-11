import { all } from 'redux-saga/effects'

import { appSagas } from './app'
import { accountSagas } from './accounts'
import { docSagas } from './docs'
import { githubSagas } from './github'
import { ledgerSagas } from './ledger'
import { networkSagas } from './network'
import { postlistSagas } from './postlists'

export default function* rootSage() {
  yield all([
    ...appSagas,
    ...accountSagas,
    ...docSagas,
    ...githubSagas,
    ...ledgerSagas,
    ...networkSagas,
    ...postlistSagas
  ])
}
