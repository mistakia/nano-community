import { call, put, cancelled, select } from 'redux-saga/effects'
// import { LOCATION_CHANGE } from 'connected-react-router'

import { api, apiRequest } from '@core/api/service'
import { getApp } from '@core/app'
import { githubDiscussionsRequestActions } from '@core/github-discussions/actions'
import { githubEventsRequestActions } from '@core/github-events/actions'
import { githubIssuesRequestActions } from '@core/github-issues/actions'
import { postlistRequestActions } from '@core/postlists/actions'
import {
  docRequestActions,
  labelDocRequestActions,
  docCommitRequestActions,
  labelDocCommitRequestActions
} from '@core/docs/actions'
import {
  networkStatsRequestActions,
  weightRequestActions,
  weightHistoryRequestActions
} from '@core/network/actions'
import {
  representativesRequestActions,
  accountRequestActions,
  accountOpenRequestActions,
  accountBlocksSummaryRequestActions,
  accountBalanceHistoryRequestActions,
  accountStatsRequestActions,
  accountBlocksPerDayRequestActions
} from '@core/accounts/actions'
import { blockRequestActions } from '@core/blocks/actions'
import { dailyRequestActions } from '@core/ledger/actions'
import {
  block_confirmed_summary_request_actions,
  accounts_unconfirmed_summary_request_actions,
  blocks_unconfirmed_summary_request_actions,
  price_history_request_actions
} from '@core/nanodb/actions'

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
export const getLabelDoc = fetch.bind(
  null,
  api.getLabelDoc,
  labelDocRequestActions
)
export const getDocCommit = fetch.bind(
  null,
  api.getDocCommit,
  docCommitRequestActions
)
export const getLabelDocCommit = fetch.bind(
  null,
  api.getLabelDocCommit,
  labelDocCommitRequestActions
)
export const getGithubDiscussions = fetch.bind(
  null,
  api.getGithubDiscussions,
  githubDiscussionsRequestActions
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

export const get_blocks_confirmed_summary = fetch.bind(
  null,
  api.get_blocks_confirmed_summary,
  block_confirmed_summary_request_actions
)

export const get_accounts_unconfirmed_summary = fetch.bind(
  null,
  api.get_accounts_unconfirmed_summary,
  accounts_unconfirmed_summary_request_actions
)

export const get_blocks_unconfirmed_summary = fetch.bind(
  null,
  api.get_blocks_unconfirmed_summary,
  blocks_unconfirmed_summary_request_actions
)

export const get_account_balance_history = fetch.bind(
  null,
  api.get_account_balance_history,
  accountBalanceHistoryRequestActions
)

export const get_price_history = fetch.bind(
  null,
  api.get_price_history,
  price_history_request_actions
)

export const get_account_stats = fetch.bind(
  null,
  api.get_account_stats,
  accountStatsRequestActions
)

export const get_account_blocks_per_day = fetch.bind(
  null,
  api.get_account_blocks_per_day,
  accountBlocksPerDayRequestActions
)
