import { call, put, cancelled, select } from 'redux-saga/effects'
// import { LOCATION_CHANGE } from 'connected-react-router'

import { api, apiRequest } from '@core/api/service'
import { getApp } from '@core/app'
import { postlistRequestActions } from '@core/postlists'
import { docRequestActions } from '@core/docs'

function* fetchAPI(apiFunction, actions, opts = {}) {
  const { token } = yield select(getApp)
  const { abort, request } = apiRequest(apiFunction, opts, token)
  try {
    yield put(actions.pending(opts))
    const data = yield call(request)
    yield put(actions.fulfilled(opts, data))
  } catch (err) {
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

export const getPosts = fetch.bind(null, api.getPosts, postlistRequestActions)
export const getDoc = fetch.bind(null, api.getDoc, docRequestActions)
