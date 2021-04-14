const moment = require('moment')
const { request } = require('../common')

const main = async () => {
  const url = 'https://forum.nano.org/posts.json'
  let res
  try {
    res = await request({ url })
  } catch (err) {
    console.log(err)
  }

  if (!res) {
    return
  }

  const posts = res.latest_posts.map((p) => ({
    pid: `forum:post:${p.id}`,
    title: p.topic_title,
    url: `https://forum.nano.org/t/${p.topic_slug}/${p.topic_id}/${p.post_number}`,
    author: p.username,
    created_at: moment(p.created_at).unix(),
    updated_at: moment(p.updated_at).unix(),
    html: p.cooked,
    text: p.raw,
    score: p.score
  }))
  console.log(posts)
}

module.exports = main

if (!module.parent) {
  const init = async () => {
    await main()
    process.exit()
  }

  try {
    init()
  } catch (err) {
    console.log(err)
  }
}
