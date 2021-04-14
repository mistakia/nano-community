const { request } = require('../common')

const subreddits = ['nanocurrency', 'nanotrade']

const main = async (user) => {
  const url = `https://www.reddit.com/u/${user}.json`
  let res
  try {
    res = await request({ url })
  } catch (err) {
    console.log(err)
  }

  if (!res) {
    return
  }

  console.log(res.data.children[3])
  const posts = res.data.children
    .filter((p) => subreddits.includes(p.data.subreddit))
    .map((p) => ({
      pid: `reddit:comment:${p.data.id}`,
      title: null,
      url: p.data.permalink,
      author: p.data.author,
      created_at: p.data.created,
      updated_at: p.data.edited,
      html: p.data.body_html,
      text: p.data.body,
      score: p.data.score // p.data.upvote_ratio + p.data.ups + p.data.total_awards_received + p.data.score + p.num_comments - p.data.downs
    }))
  console.log(posts)
}

module.exports = main

if (!module.parent) {
  const init = async () => {
    await main('meor')
    process.exit()
  }

  try {
    init()
  } catch (err) {
    console.log(err)
  }
}
