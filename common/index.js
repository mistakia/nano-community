const { default: fetch, Request } = require('node-fetch')

const config = require('../config')
const constants = require('../constants')

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

const getNetworkInfo = (ip) => {
  const url = `http://ip-api.com/json/${ip}?fields=status,message,continent,country,countryCode,region,regionName,city,zip,lat,lon,timezone,isp,org,as,asname,hosting,query`
  return request({ url })
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

const rpcRequest = async (data, { url, trusted = false } = {}) => {
  if (url) {
    const options = { url, ...POST(data) }
    return request(options)
  }

  const addresses = trusted ? config.trustedAddresses : config.rpcAddresses
  // iterate through rpc nodes until success
  let res
  for (let i = 0; i < addresses.length; i++) {
    try {
      const url = addresses[i]
      const options = { url, ...POST(data) }
      res = await request(options)
    } catch (err) {
      res = null
    }

    if (res && !res.error) {
      return res
    }
  }

  return res
}

const rpcTelemetry = async ({ url } = {}) => {
  const data = {
    action: 'telemetry',
    raw: true
  }
  return rpcRequest(data, { url })
}

const rpcConfirmationQuorum = ({ url } = {}) => {
  const data = {
    action: 'confirmation_quorum',
    peer_details: true
  }
  return rpcRequest(data, { url })
}

const rpcRepresentativesOnline = ({ url } = {}) => {
  const data = {
    action: 'representatives_online',
    weight: true
  }
  return rpcRequest(data, { url })
}

const rpcAccountInfo = ({
  account,
  url,
  representative = false,
  pending = false,
  include_confirmed = false
} = {}) => {
  const data = {
    action: 'account_info',
    weight: true,
    representative,
    include_confirmed,
    pending,
    account
  }
  return rpcRequest(data, { url })
}

const rpcRepresentatives = ({ url } = {}) => {
  const data = {
    action: 'representatives'
  }
  return rpcRequest(data, { url })
}

const rpcLedger = ({
  url,
  account = constants.BURN_ACCOUNT,
  count = 1,
  threshold = 100000000000000000,
  modified_since,
  representative = false,
  pending = false,
  weight = false
} = {}) => {
  const data = {
    action: 'ledger',
    pending,
    representative,
    weight,
    account,
    threshold,
    count,
    modified_since
  }
  return rpcRequest(data, { url, trusted: true })
}

const rpcBlockInfo = ({ url, hash } = {}) => {
  const data = {
    action: 'block_info',
    json_block: true,
    hash
  }
  return rpcRequest(data, { url })
}

const rpcBlocksInfo = ({
  url,
  hashes,
  pending = false,
  source = false,
  balance = false
} = {}) => {
  const data = {
    action: 'blocks_info',
    json_block: true,
    pending,
    source,
    balance,
    hashes
  }
  return rpcRequest(data, { url })
}

const rpc = {
  telemetry: rpcTelemetry,
  confirmationQuorum: rpcConfirmationQuorum,
  representativesOnline: rpcRepresentativesOnline,
  accountInfo: rpcAccountInfo,
  blockInfo: rpcBlockInfo,
  blocksInfo: rpcBlocksInfo,
  representatives: rpcRepresentatives,
  ledger: rpcLedger
}

/* eslint-disable no-extra-semi */
const groupBy = (xs, key) =>
  xs.reduce((rv, x) => {
    ;(rv[x[key]] = rv[x[key]] || []).push(x)
    return rv
  }, {})
/* eslint-enable no-extra-semi */

module.exports = {
  request,
  getNetworkInfo,
  POST,
  wait,
  rpc,
  formatRedditPost,
  formatRedditComment,
  groupBy
}
