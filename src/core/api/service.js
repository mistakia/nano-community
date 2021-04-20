/* global AbortController, fetch, REPO */

import queryString from 'query-string'
import merge from 'deepmerge'

import { BASE_URL } from '@core/constants'

export const api = {
  getPosts({ id, ...params }) {
    const url = `${BASE_URL}/posts/${id}?${queryString.stringify(params)}`
    return { url }
  },
  getDoc({ id }) {
    const url = `${BASE_URL}/docs${id}.md`
    return { url }
  },
  getDocCommit({ id }) {
    const params = { path: `docs${id}.md`, page: 1, per_page: 1 }
    const url = `https://api.github.com/repos/${REPO}/commits?${queryString.stringify(params)}`
    return { url }
  }
}

export const apiRequest = (apiFunction, opts, token) => {
  const controller = new AbortController()
  const abort = controller.abort.bind(controller)
  const headers = apiFunction !== api.getDocCommit ? { Authorization: `Bearer ${token}`, credentials: 'include' } : {}
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
    if (options.url.includes('docs') && !options.url.includes('github')) {
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
