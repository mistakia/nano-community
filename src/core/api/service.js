/* global AbortController, fetch, REPO */

import queryString from 'query-string'
import merge from 'deepmerge'

import { API_URL } from '@core/constants'

export const api = {
  getAccount(account) {
    const url = `${API_URL}/accounts/${account}`
    return { url }
  },
  getAccountOpen(account) {
    const url = `${API_URL}/accounts/${account}/open`
    return { url }
  },
  getAccountBlocksSummary({ account, type, ...params }) {
    const url = `${API_URL}/accounts/${account}/blocks/${type}/summary?${queryString.stringify(
      params
    )}`
    return { url }
  },
  getBlock(hash) {
    const url = `${API_URL}/blocks/${hash}`
    return { url }
  },
  getDaily() {
    const url = `${API_URL}/nanodb/ledger/daily`
    return { url }
  },
  getPosts({ id, ...params }) {
    const url = `${API_URL}/posts/${id}?${queryString.stringify(params)}`
    return { url }
  },
  getDoc({ id }) {
    const url = `${API_URL}/docs${id}.md`
    return { url }
  },
  getTagDoc({ id }) {
    const url = `${API_URL}${id}.md`
    return { url }
  },
  getGithubEvents() {
    const url = `${API_URL}/github/events/nano-node?exclude=WatchEvent&exclude=DeleteEvent`
    return { url }
  },
  getNetworkStats() {
    const url = `${API_URL}/network`
    return { url }
  },
  getRepresentatives() {
    const url = `${API_URL}/representatives`
    return { url }
  },
  getDocCommit({ id }) {
    const params = { path: `docs${id}.md`, page: 1, per_page: 100 }
    const url = `https://api.github.com/repos/${REPO}/commits?${queryString.stringify(
      params
    )}`
    return { url }
  },
  getTagDocCommit({ id }) {
    const params = { path: `${id}.md`, page: 1, per_page: 100 }
    const url = `https://api.github.com/repos/${REPO}/commits?${queryString.stringify(
      params
    )}`
    return { url }
  },
  getWeight() {
    const url = `${API_URL}/weight`
    return { url }
  },
  getWeightHistory() {
    const url = `${API_URL}/weight/history`
    return { url }
  }
}

export const apiRequest = (apiFunction, opts, token) => {
  const controller = new AbortController()
  const abort = controller.abort.bind(controller)
  const headers =
    apiFunction !== api.getDocCommit && apiFunction !== api.getTagDocCommit
      ? { Authorization: `Bearer ${token}`, credentials: 'include' }
      : {}
  const defaultOptions = { headers }
  const options = merge(defaultOptions, apiFunction(opts), {
    signal: controller.signal
  })
  const request = dispatchFetch.bind(null, options)
  return { abort, request }
}

export const dispatchFetch = async (options) => {
  const response = await fetch(options.url, options)
  if (response.status >= 200 && response.status < 300) {
    if (options.url.includes('.md') && !options.url.includes('github')) {
      return response.text()
    } else {
      return response.json()
    }
  } else {
    const res = await response.json()
    const error = new Error(res.error || response.statusText)
    error.response = response
    throw error
  }
}
