import { cloudflare } from '#config'

import request from './request.mjs'

export const getRecords = async (name) => {
  let url = `https://api.cloudflare.com/client/v4/zones/${cloudflare.zone_id}/dns_records`
  if (name) {
   url = `${url}?name=${name}`
  }

  const options = {
    method: 'GET',
    url,
    headers: {
      'X-Auth-Email': cloudflare.user_email,
      'Authorization': `Bearer ${cloudflare.token}`,
      'Content-Type': 'application/json'
    }
  }

  return request(options)
}
