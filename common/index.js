const { default: fetch, Request } = require('node-fetch')

const config = require('../config')

const request = async (options) => {
  const request = new Request(options.url, options)
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

const POST = (data) => ({
  method: 'POST',
  body: JSON.stringify(data),
  headers: {
    'Content-Type': 'application/json'
  }
})

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const formatRedditComment = (p) => ({
  pid: `reddit:${p.data.subreddit}:comment:${p.data.id}`,
  sid: `reddit:${p.data.subreddit}`,
  title: null,
  url: p.data.permalink,
  author: p.data.author,
  authorid: p.data.author,
  created_at: p.data.created_utc,
  updated_at: undefined,
  html: p.data.body_html,
  text: p.data.body,
  score: p.data.score // p.data.upvote_ratio + p.data.ups + p.data.total_awards_received + p.data.score + p.num_comments - p.data.downs
})

const formatRedditPost = (p) => ({
  pid: `reddit:${p.data.subreddit}:post:${p.data.id}`,
  sid: `reddit:${p.data.subreddit}`,
  title: p.data.title,
  url: p.data.permalink,
  author: p.data.author,
  authorid: p.data.author,
  created_at: p.data.created_utc,
  updated_at: undefined,
  html: p.data.selftext_html,
  text: p.data.selftext,
  score: p.data.score // p.data.upvote_ratio + p.data.ups + p.data.total_awards_received + p.data.score + p.num_comments - p.data.downs
})

const rpcRequest = (data, { url = config.rpcAddress } = {}) => {
  return { url, ...POST(data) }
}

const rpcTelemetry = async ({ url } = {}) => {
  const data = {
    action: 'telemetry',
    raw: true
  }
  const options = rpcRequest(data, { url })
  return request(options)
}

const rpcConfirmationQuorum = ({ url } = {}) => {
  const data = {
    action: 'confirmation_quorum',
    peer_details: true
  }
  const options = rpcRequest(data, { url })
  return request(options)
}

const rpc = {
  telemetry: rpcTelemetry,
  confirmationQuorum: rpcConfirmationQuorum
}

module.exports = {
  request,
  POST,
  wait,
  rpc,
  formatRedditPost,
  formatRedditComment
}
