const { request } = require('../common')

const main = async (subreddit) => {
  const url = `https://www.reddit.com/r/${subreddit}.json`
  let res
  try {
    res = await request({ url })
  } catch (err) {
    console.log(err)
  }

  if (!res) {
    return
  }

  const posts = res.data.children.map((p) => ({
    pid: `reddit:post:${p.data.id}`,
    title: p.data.title,
    url: p.data.url,
    author: p.data.author,
    created_at: p.data.created,
    updated_at: p.data.edited,
    html: p.data.selftext_html,
    text: p.data.selftext,
    score: p.data.score // p.data.upvote_ratio + p.data.ups + p.data.total_awards_received + p.data.score + p.num_comments - p.data.downs
  }))
  console.log(posts)
}

module.exports = main

if (!module.parent) {
  const init = async () => {
    await main('nanocurrency')
    process.exit()
  }

  try {
    init()
  } catch (err) {
    console.log(err)
  }
}
