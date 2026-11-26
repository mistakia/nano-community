import express from 'express'
import dayjs from 'dayjs'

import { groupBy } from '#common'
import { epoch_seconds_sql } from '#libs-server/epoch-seconds.mjs'

const router = express.Router()

router.get('/', async (req, res) => {
  const { logger, db } = req.app.locals
  try {
    const rows = await db('representatives_telemetry')
      .select(
        'representatives_telemetry.account',
        db.raw(
          epoch_seconds_sql(
            'representatives_telemetry.observed_at',
            'timestamp'
          )
        ),
        'representatives_telemetry.cemented_behind'
      )
      .innerJoin(
        'accounts',
        'representatives_telemetry.account',
        'accounts.account'
      )
      .where('observed_at', '>', dayjs().subtract('1', 'week').toDate())

    const grouped = groupBy(rows, 'account')

    res.send(grouped)
  } catch (error) {
    logger(error)
    res.status(500).send({ error: error.toString() })
  }
})

export default router
