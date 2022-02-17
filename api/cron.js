const cron = require('node-cron')

const db = require('../db')

const updateSources = async () => {
  const sources = await db('sources')
  const sids = sources.map((s) => s.id)
  for (const sid of sids) {
    await updateSourceScore(sid)
  }
}

const updateSourceScore = async (sid) => {
  const query = db('posts')
  query.select(db.raw('avg(score) as score_avg'))
  query.where('sid', sid)
  query.where('score', '>', 1.0)
  query.whereRaw('created_at >= (UNIX_TIMESTAMP() - (86400 * 14))')
  const result = await query
  const { score_avg } = result[0]
  if (score_avg) {
    await db('sources').update({ score_avg }).where('id', sid)
  }
}

cron.schedule('*/15 * * * *', async () => {
  if (process.env.NODE_ENV !== 'production') {
    return
  }

  try {
    await updateSources()
  } catch (err) {
    console.log(err)
  }
})

if (!module.parent) {
  const init = async () => {
    await updateSources()
    process.exit()
  }

  try {
    init()
  } catch (err) {
    console.log(err)
    process.exit()
  }
}
