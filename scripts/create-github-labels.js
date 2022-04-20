const debug = require('debug')
const yargs = require('yargs/yargs')
const { hideBin } = require('yargs/helpers')

const { request, wait } = require('../common')
const config = require('../config')
const labels = require('../default-labels')

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
      Authorization: `token ${config.github_access_token}`
    }
  })
}

const main = async ({ repo }) => {
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

module.exports = main

if (!module.parent) {
  const init = async () => {
    try {
      if (!argv.repo) {
        console.log('missing --repo')
        process.exit()
      }
      await main({ repo: argv.repo })
    } catch (err) {
      console.log(err)
    }
    process.exit()
  }

  try {
    init()
  } catch (err) {
    console.log(err)
    process.exit()
  }
}
