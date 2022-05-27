import fetch, { Request } from 'node-fetch'

const request = async (options) => {
  const request = new Request(options.url, {
    timeout: 20000,
    ...options
  })
  const response = await fetch(request)

  if (response.status >= 200 && response.status < 300) {
    return response.json()
  } else {
    const res = await response.json()
    const error = new Error(res.error || response.statusText)
    error.response = response
    throw error
  }
}

export default request
