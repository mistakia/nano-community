import queryString from 'query-string'

import { cloudflare } from '#config'

import request from './request.mjs'

export const getRecords = async ({ name, per_page = 300 }) => {
  let url = `https://api.cloudflare.com/client/v4/zones/${cloudflare.zone_id}/dns_records`

  const qs = queryString.stringify(
    {
      name,
      per_page
    },
    {
      skipNull: true
    }
  )

  if (qs) {
    url = `${url}?${qs}`
  }

  const options = {
    method: 'GET',
    url,
    headers: {
      'X-Auth-Email': cloudflare.user_email,
      Authorization: `Bearer ${cloudflare.token}`,
      'Content-Type': 'application/json'
    }
  }

  return request(options)
}

export const createRecord = async ({
  type,
  name,
  content,
  ttl = 1,
  proxied = false
}) => {
  const options = {
    method: 'POST',
    url: `https://api.cloudflare.com/client/v4/zones/${cloudflare.zone_id}/dns_records`,
    headers: {
      'X-Auth-Email': cloudflare.user_email,
      Authorization: `Bearer ${cloudflare.token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      type,
      name,
      content,
      ttl,
      proxied
    })
  }

  return request(options)
}

export const deleteRecord = async ({ id }) => {
  const options = {
    method: 'DELETE',
    url: `https://api.cloudflare.com/client/v4/zones/${cloudflare.zone_id}/dns_records/${id}`,
    headers: {
      'X-Auth-Email': cloudflare.user_email,
      Authorization: `Bearer ${cloudflare.token}`,
      'Content-Type': 'application/json'
    }
  }

  return request(options)
}

export const updateRecord = async ({
  id,
  type,
  name,
  content,
  ttl = 1,
  proxied = false
}) => {
  const options = {
    method: 'PUT',
    url: `https://api.cloudflare.com/client/v4/zones/${cloudflare.zone_id}/dns_records/${id}`,
    headers: {
      'X-Auth-Email': cloudflare.user_email,
      Authorization: `Bearer ${cloudflare.token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      type,
      name,
      content,
      ttl,
      proxied
    })
  }

  return request(options)
}
