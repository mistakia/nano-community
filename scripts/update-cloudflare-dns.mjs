import debug from 'debug'

import { cloudflare, isMain, getData } from '#common'

const log = debug('update-cloudflare-dns')
debug.enable('update-cloudflare-dns')

const updateCloudflareDNS = async () => {
  const mappings = await getData('representative-mappings')
  if (!mappings) {
    log('representative mappings not found')
    return
  }

  const records = await cloudflare.getRecords({
    name: 'representatives.nano.community'
  })

  // delete any records not in mapping
  for (const record of records.result) {
    const exists = mappings.find((m) => m.address === record.content)
    if (!exists) {
      try {
        log(`Deleting record for ${record.content}`)
        await cloudflare.deleteRecord(record)
      } catch (err) {
        log(err)
      }
    }
  }

  for (const mapping of mappings) {
    const exists = records.result.find((r) => r.content === mapping.address)
    if (exists) {
      continue
    }

    log(`Creating record for ${mapping.address}`)

    const options = {
      type: 'AAAA',
      name: 'representatives.nano.community',
      content: mapping.address,
      ttl: 60,
      proxied: false
    }

    try {
      await cloudflare.createRecord(options)
    } catch (err) {
      log(err)
      log(options)
    }
  }

  log('Finished updating cloudflare dns records')
}

if (isMain(import.meta.url)) {
  const main = async () => {
    try {
      await updateCloudflareDNS()
    } catch (err) {
      console.log(err)
    }
    process.exit()
  }

  try {
    main()
  } catch (err) {
    console.log(err)
    process.exit()
  }
}

export default updateCloudflareDNS
