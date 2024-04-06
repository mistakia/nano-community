import debug from 'debug'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'

import { request, wait, isMain } from '#common'
import config from '#config'
import labels from '#root/default-labels.mjs'

const { github_access_token } = config
const argv = yargs(hideBin(process.argv)).argv
const logger = debug('create-github-labels')
debug.enable('create-github-labels')

const createLabel = async ({ repo, name, color, description }) => {
  const body = {
    name,
    color,
    description
  }
  const url = `https://api.github.com/repos/${repo}/labels`

  return request({
    url,
    method: 'POST',
    body: JSON.stringify(body),
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/vnd.github.v3+json',
      Authorization: `token ${github_access_token}`
    }
  })
}

const createGithubLabels = async ({ repo }) => {
  logger(`Creating default labels in ${repo}`)

  for (const label of labels) {
    let res
    try {
      res = await createLabel({
        repo,
        ...label
      })

      logger(`Successfully created label: ${label.name}, id: ${res.id}`)
    } catch (error) {
      logger(`Failed to create label: ${label.name}`)
      logger(error)
    }

    await wait(3000)
  }
}

if (isMain(import.meta.url)) {
  const main = async () => {
    try {
      if (!argv.repo) {
        console.log('missing --repo')
        process.exit()
      }
      await createGithubLabels({ repo: argv.repo })
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

export default createGithubLabels
