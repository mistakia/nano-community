const debug = require('debug')
const yargs = require('yargs/yargs')
const { hideBin } = require('yargs/helpers')
const { graphql } = require('@octokit/graphql')

// const { request } = require('../common')
const config = require('../config')

const argv = yargs(hideBin(process.argv)).argv
const log = debug('import-github-discussions')
debug.enable('import-github-discussions')

const main = async ({ repo }) => {
  const { repository } = await graphql(
    `
      {
        repository(name: "nano-community", owner: "mistakia") {
          discussions(last: 100) {
            nodes {
              body
              author {
                avatarUrl
                ... on User {
                  id
                  email
                  name
                }
              }
            }
          }
        }
      }
    `,
    {
      headers: {
        authorization: `token ${config.github_access_token}`
      }
    }
  )

  log(repository.discussions.nodes)
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
