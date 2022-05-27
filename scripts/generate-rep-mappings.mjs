import debug from 'debug'

import { request, isMain, getData, saveData } from '#common'

const log = debug('generate-rep-mappings')
debug.enable('generate-rep-mappings')

const generateRepMappings = async () => {
  const url = 'https://nano.community/data/representative-observations.json'
  const representatives = await request({ url })

  const current_mappings = (await getData('representative-mappings')) || []
  const mapping_results = []

  for (const rep of representatives) {
    const { alias, account, weight } = rep
    const sorted_node_ids = rep.node_ids.sort(
      (a, b) => b.observations - a.observations
    )
    const most_observed = sorted_node_ids[0]

    if (!most_observed) {
      continue
    }

    // check if current node_id is the most observed
    if (most_observed.node_id === rep.current_observation.node_id) {
      // use current observation
      mapping_results.push({
        alias,
        account,
        weight,
        ...rep.current_observation
      })
    } else {
      const addresses = rep.node_ids.map((n) => n.addresses).flat()
      const sorted_addresses = addresses.sort(
        (a, b) => b.observations - a.observations
      )
      const most_observed_address = sorted_addresses[0]

      // check if current address is the most observed
      if (most_observed_address.address === rep.current_observation.address) {
        // use current observation
        mapping_results.push({
          alias,
          account,
          weight,
          ...rep.current_observation
        })

        continue
      }

      log('Current node_id observation is not the most observed', {
        account,
        alias,
        weight,
        ...rep.current_observation
      })

      const current_mapping = current_mappings.find(
        (m) => m.account === account
      )
      if (current_mapping) {
        mapping_results.push(current_mapping)
      } else {
        mapping_results.push({
          alias,
          account,
          weight,
          ...rep.current_observation
        })
      }
    }
  }

  await saveData('representative-mappings', mapping_results)
}

if (isMain(import.meta.url)) {
  const main = async () => {
    try {
      await generateRepMappings()
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

export default generateRepMappings
