import { all } from 'redux-saga/effects'

import { appSagas } from './app'
import { accountSagas } from './accounts'
import { blockSagas } from './blocks'
import { docSagas } from './docs'
import { githubDiscussionsSagas } from './github-discussions'
import { githubEventsSagas } from './github-events'
import { githubIssuesSagas } from './github-issues'
import { ledgerSagas } from './ledger'
import { networkSagas } from './network'
import { postlistSagas } from './postlists'
import { nanodb_sagas } from './nanodb'

export default function* rootSage() {
  yield all([
    ...appSagas,
    ...accountSagas,
    ...blockSagas,
    ...docSagas,
    ...githubDiscussionsSagas,
    ...githubEventsSagas,
    ...githubIssuesSagas,
    ...ledgerSagas,
    ...networkSagas,
    ...postlistSagas,
    ...nanodb_sagas
  ])
}
