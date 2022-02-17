import { call, put, cancelled, select } from 'redux-saga/effects'
// import { LOCATION_CHANGE } from 'connected-react-router'

import { api, apiRequest } from '@core/api/service'
import { getApp } from '@core/app'
import { githubEventsRequestActions } from '@core/github-events'
import { githubIssuesRequestActions } from '@core/github-issues'
import { postlistRequestActions } from '@core/postlists'
import {
  docRequestActions,
  tagDocRequestActions,
  docCommitRequestActions,
  tagDocCommitRequestActions
} from '@core/docs'
import {
  networkStatsRequestActions,
  weightRequestActions,
  weightHistoryRequestActions
} from '@core/network'
import {
  representativesRequestActions,
  accountRequestActions,
  accountOpenRequestActions,
  accountBlocksSummaryRequestActions
} from '@core/accounts'
import { blockRequestActions } from '@core/blocks'
import { dailyRequestActions } from '@core/ledger'

function* fetchAPI(apiFunction, actions, opts = {}) {
  const { token } = yield select(getApp)
  const { abort, request } = apiRequest(apiFunction, opts, token)
  try {
    yield put(actions.pending(opts))
    const data = yield call(request)
    yield put(actions.fulfilled(opts, data))
  } catch (err) {
    console.log(err)
    if (!opts.ignoreError) {
      /* yield put(notificationActions.show({ severity: 'error', message: err.message }))
       * Bugsnag.notify(err, (event) => {
       *   event.addMetadata('options', opts)
       * }) */
    }
    yield put(actions.failed(opts, err.toString()))
  } finally {
    if (yield cancelled()) {
      abort()
    }
  }
}

function* fetch(...args) {
  yield call(fetchAPI.bind(null, ...args))
  // yield race([call(fetchAPI.bind(null, ...args)), take(LOCATION_CHANGE)])
}

export const getAccount = fetch.bind(
  null,
  api.getAccount,
  accountRequestActions
)
export const getAccountOpen = fetch.bind(
  null,
  api.getAccountOpen,
  accountOpenRequestActions
)
export const getAccountBlocksSummary = fetch.bind(
  null,
  api.getAccountBlocksSummary,
  accountBlocksSummaryRequestActions
)
export const getBlock = fetch.bind(null, api.getBlock, blockRequestActions)
export const getPosts = fetch.bind(null, api.getPosts, postlistRequestActions)
export const getDoc = fetch.bind(null, api.getDoc, docRequestActions)
export const getTagDoc = fetch.bind(null, api.getTagDoc, tagDocRequestActions)
export const getDocCommit = fetch.bind(
  null,
  api.getDocCommit,
  docCommitRequestActions
)
export const getTagDocCommit = fetch.bind(
  null,
  api.getTagDocCommit,
  tagDocCommitRequestActions
)
export const getGithubEvents = fetch.bind(
  null,
  api.getGithubEvents,
  githubEventsRequestActions
)
export const getGithubIssues = fetch.bind(
  null,
  api.getGithubIssues,
  githubIssuesRequestActions
)
export const getNetworkStats = fetch.bind(
  null,
  api.getNetworkStats,
  networkStatsRequestActions
)
export const getRepresentatives = fetch.bind(
  null,
  api.getRepresentatives,
  representativesRequestActions
)
export const getWeight = fetch.bind(null, api.getWeight, weightRequestActions)
export const getWeightHistory = fetch.bind(
  null,
  api.getWeightHistory,
  weightHistoryRequestActions
)
export const getDaily = fetch.bind(null, api.getDaily, dailyRequestActions)
