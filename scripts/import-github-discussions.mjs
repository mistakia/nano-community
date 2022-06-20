import debug from 'debug'
import dayjs from 'dayjs'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import { graphql } from '@octokit/graphql'

import { isMain } from '#common'
import { github_access_token } from '#config'
import db from '#db'

const argv = yargs(hideBin(process.argv)).argv
const log = debug('import-github-discussions')
debug.enable('import-github-discussions')

const getDiscussions = async ({ repo, query }) => {
  const paths = repo.split('/')
  const name = paths[1]
  const owner = paths[0]

  const { repository } = await graphql(
    `
{
  repository(name: "${name}", owner: "${owner}") {
    discussions(
      ${query}
      orderBy: { field: UPDATED_AT, direction: DESC }
    ) {
      nodes {
        body
        id
        title
        url
        category {
          id
          name
        }
        author {
          avatarUrl
          ... on User {
            id
            name
          }
        }
        number
        publishedAt
        updatedAt
        upvoteCount
        labels(last: 100) {
          nodes {
            id
            name
            color
          }
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
}
    `,
    {
      headers: {
        authorization: `token ${github_access_token}`
      }
    }
  )

  return {
    discussions: repository.discussions.nodes,
    ...repository.discussions.pageInfo
  }
}

const formatDiscussion = ({ item, repo }) => ({
  id: item.id,
  author_id: item.author.id,
  author_name: item.author.name,
  author_avatar: item.author.avatarUrl,
  ref: item.number,
  title: item.title,
  url: item.url,
  repo: repo,
  body: item.body,
  upvotes: item.upvoteCount,
  category_id: item.category.id,
  category_name: item.category.name,
  created_at: dayjs(item.publishedAt).unix(),
  updated_at: item.updatedAt ? dayjs(item.updatedAt).unix() : null
})

const formatLabels = ({ id, item }) => ({
  discussion_id: id,
  label_id: item.id,
  label_name: item.name,
  label_color: item.color
})

const saveDiscussions = async ({ items, repo }) => {
  const discussions = []
  const discussion_labels = []
  for (const item of items) {
    const discussion = formatDiscussion({ item, repo })
    discussions.push(discussion)
    for (const label_item of item.labels.nodes) {
      const labels = formatLabels({ id: discussion.id, item: label_item })
      discussion_labels.push(labels)
    }
  }

  if (discussions.length) {
    log(`saving ${discussions.length} discussions`)
    await db('github_discussions').insert(discussions).onConflict().merge()
  }

  if (discussion_labels.length) {
    log(`saving ${discussion_labels.length} labels`)

    // delete any potentially stale labels
    const discussionIds = discussion_labels.map((i) => i.discussion_id)
    await db('github_discussion_labels')
      .del()
      .whereIn('discussion_id', discussionIds)

    await db('github_discussion_labels')
      .insert(discussion_labels)
      .onConflict()
      .merge()
  }
}

const importGithubDiscussions = async ({ repo, all = false }) => {
  if (!repo) {
    log('missing repo')
    return
  }

  log(`importing discussions from ${repo}`)

  let lastUpdated
  if (all) {
    log('importing all discussions')
  } else {
    const rows = await db('github_discussions')
      .where({ repo })
      .orderBy('updated_at', 'desc')
      .limit(1)
    lastUpdated = rows.length ? rows[0].updated_at : undefined
    log(`importing discussions updated since: ${lastUpdated}`)
  }

  let result = {}
  do {
    const query = result.endCursor
      ? `after: "${result.endCursor}"`
      : 'last: 100'
    result = await getDiscussions({ repo, query })

    const { discussions } = result
    await saveDiscussions({ items: discussions, repo })

    const lastDiscussion = discussions[discussions.length - 1]
    const lastDiscussionUpdatedAt = dayjs(lastDiscussion.updatedAt).unix()
    log(`last retreived discussion updated at: ${lastDiscussionUpdatedAt}`)
    if (lastDiscussionUpdatedAt < lastUpdated) {
      log(
        `retrieved all updated discussions since last updated: ${lastUpdated}`
      )
      break
    }
  } while (result.hasNextPage)
}

if (isMain(import.meta.url)) {
  const main = async () => {
    try {
      if (!argv.repo) {
        console.log('missing --repo')
        process.exit()
      }

      await importGithubDiscussions({ repo: argv.repo })
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

export default importGithubDiscussions
