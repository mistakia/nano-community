import React, { useEffect, useState, useMemo } from 'react'
import PropTypes from 'prop-types'
import ImmutablePropTypes from 'react-immutable-proptypes'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import percentile from 'percentile'

import Seo from '@components/seo'
import Menu from '@components/menu'
import MetricCard from '@components/metric-card'

import './live.styl'

const seconds_in_period = {
  '10m': 600,
  '30m': 1800,
  '1h': 3600,
  '4h': 14400,
  '24h': 86400
}

export default function LivePage({
  nanodb,
  get_blocks_confirmed_summary,
  get_accounts_unconfirmed_summary,
  get_blocks_unconfirmed_summary
}) {
  const [current_period, set_current_period] = useState('10m')

  useEffect(() => {
    get_blocks_confirmed_summary(current_period)
  }, [get_blocks_confirmed_summary, current_period])

  useEffect(() => {
    get_accounts_unconfirmed_summary()
  }, [get_accounts_unconfirmed_summary])

  useEffect(() => {
    get_blocks_unconfirmed_summary()
  }, [get_blocks_unconfirmed_summary])

  const confirmation_latency_by_bucket = useMemo(
    () =>
      nanodb.getIn(
        [
          `block_confirmed_summary_${current_period}`,
          'confirmation_latency_ms_by_bucket'
        ],
        {}
      ),
    [nanodb, current_period]
  )

  const bucket_values = useMemo(
    () => Object.values(confirmation_latency_by_bucket),
    [confirmation_latency_by_bucket]
  )
  const total_confirmations = useMemo(
    () =>
      bucket_values.reduce(
        (acc, { confirmed_blocks = 0 }) => acc + confirmed_blocks,
        0
      ),
    [bucket_values]
  )

  const confirmations_per_second = useMemo(
    () =>
      parseFloat(
        (total_confirmations / seconds_in_period[current_period]).toFixed(3)
      ),
    [total_confirmations, current_period]
  )

  const buckets_sorted_by_confirmed_blocks = useMemo(
    () =>
      bucket_values
        .filter((b) => b.confirmed_blocks)
        .sort((a, b) => a.confirmed_blocks - b.confirmed_blocks),
    [bucket_values]
  )
  const median_bucket = useMemo(
    () =>
      buckets_sorted_by_confirmed_blocks[
        Math.floor(buckets_sorted_by_confirmed_blocks.length / 2)
      ] || {},
    [buckets_sorted_by_confirmed_blocks]
  )

  const confirmation_latency = median_bucket.median || 0

  const unconfirmed_accounts_count = nanodb.getIn(
    ['accounts_unconfirmed_summary', 'unconfirmed_accounts_count'],
    null
  )

  const unconfirmed_blocks_by_bucket = useMemo(
    () =>
      nanodb.getIn(
        ['blocks_unconfirmed_summary', 'unconfirmed_blocks_by_bucket'],
        {}
      ),
    [nanodb]
  )

  const unconfirmed_blocks = Object.values(unconfirmed_blocks_by_bucket).reduce(
    (acc, value) => acc + value,
    0
  )
  const confirmed_percentile_values = percentile(
    [0, 25, 75, 100],
    bucket_values.map((b) => b.confirmed_blocks)
  )
  const confirmed_percentile = {
    min: confirmed_percentile_values[0],
    p25: confirmed_percentile_values[1],
    p75: confirmed_percentile_values[2],
    max: confirmed_percentile_values[3]
  }

  const unconfirmed_percentile_values = percentile(
    [0, 25, 75, 100],
    Object.values(unconfirmed_blocks_by_bucket).map((b) => b)
  )
  const unconfirmed_percentile = {
    min: unconfirmed_percentile_values[0],
    p25: unconfirmed_percentile_values[1],
    p75: unconfirmed_percentile_values[2],
    max: unconfirmed_percentile_values[3]
  }

  console.log({
    confirmed_percentile,
    unconfirmed_percentile
  })

  return (
    <>
      <Seo
        title='Nano Block Confirmations'
        description='Nano Block Confirmations'
        tags={[
          'nano',
          'block',
          'confirmations',
          'transactions',
          'latency',
          'speed',
          'unconfirmed',
          'mempool',
          'confirmation',
          'confirmation time',
          'confirmation latency'
        ]}
      />
      <div className='live-lead'>
        <MetricCard
          title='Confirmations'
          tooltip='Total blocks confirmed in the selected period. Blocks can be representative changes or transactions'
          body={<div>{total_confirmations || '-'}</div>}
        />
        <MetricCard
          title='Confs. Per Second'
          tooltip='Average number of blocks confirmed per second in the selected period. A measure of experienced load, not capability.'
          body={<div>{confirmations_per_second || '-'}</div>}
        />
        <MetricCard
          title='Conf. Latency'
          tooltip='Median confirmation latency of the bucket with the median load'
          body={
            <div>
              {confirmation_latency ? `${confirmation_latency}ms` : '-'}
            </div>
          }
        />
        <MetricCard
          title='Unconfirmed'
          tooltip='Total number of blocks that have not been confirmed'
          body={
            <div>
              {unconfirmed_blocks === null || unconfirmed_blocks === undefined
                ? '-'
                : unconfirmed_blocks}
            </div>
          }
        />
        <MetricCard
          title='Accounts with Unconfirmed Blocks'
          tooltip='Number of accounts that have unconfirmed blocks'
          body={
            <div>
              {unconfirmed_accounts_count === null
                ? '-'
                : unconfirmed_accounts_count}
            </div>
          }
        />
        <ToggleButtonGroup
          value={current_period}
          exclusive
          onChange={(_, value) => set_current_period(value)}
          className='toggle-button-group confirmations-period'>
          <ToggleButton value='10m'>10m</ToggleButton>
          <ToggleButton value='30m'>30m</ToggleButton>
          <ToggleButton value='1h'>1h</ToggleButton>
          <ToggleButton value='4h'>4h</ToggleButton>
          <ToggleButton value='24h'>24h</ToggleButton>
        </ToggleButtonGroup>
      </div>
      <div className='buckets-container'>
        <div className='buckets-head'>
          <div className='bucket-row'>Bucket #</div>
          <div className='bucket-row'>Unconfirmed</div>
          <div className='bucket-row'>Latency</div>
          <div className='bucket-row'>Confs.</div>
        </div>
        <div className='buckets-body'>
          {Array.from({ length: 62 }).map((_, index) => {
            const confirmed_blocks =
              confirmation_latency_by_bucket[`bucket_${index}`]
                ?.confirmed_blocks || 0
            const unconfirmed_blocks =
              unconfirmed_blocks_by_bucket[`bucket_${index}`] || 0
            let confirmed_color = 'transparent'
            let unconfirmed_color = 'transparent'
            // Assuming percentile values are available for confirmed and unconfirmed blocks

            if (confirmed_blocks < confirmed_percentile.p25) {
              const maxPercent =
                (confirmed_percentile.p25 - confirmed_blocks) /
                  (confirmed_percentile.p25 - confirmed_percentile.min) /
                  1.5 || 0
              confirmed_color = `rgba(253, 162, 145, ${maxPercent})`
            } else if (
              confirmed_blocks >= confirmed_percentile.p25 &&
              confirmed_blocks <= confirmed_percentile.p75
            ) {
              const percent =
                (confirmed_blocks - confirmed_percentile.p25) /
                  (confirmed_percentile.max - confirmed_percentile.p25) || 0
              confirmed_color = `rgba(46, 163, 221, ${percent})`
            } else {
              const maxPercent =
                (confirmed_blocks - confirmed_percentile.p75) /
                  (confirmed_percentile.max - confirmed_percentile.p75) /
                  1.5 || 0
              confirmed_color = `rgba(46, 163, 221, ${maxPercent})`
            }

            if (unconfirmed_blocks < unconfirmed_percentile.p25) {
              const maxPercent =
                (unconfirmed_percentile.p25 - unconfirmed_blocks) /
                  (unconfirmed_percentile.p25 - unconfirmed_percentile.min) /
                  1.5 || 0
              unconfirmed_color = `rgba(253, 162, 145, ${maxPercent})`
            } else if (
              unconfirmed_blocks >= unconfirmed_percentile.p25 &&
              unconfirmed_blocks <= unconfirmed_percentile.p75
            ) {
              const percent =
                (unconfirmed_blocks - unconfirmed_percentile.p25) /
                  (unconfirmed_percentile.max - unconfirmed_percentile.p25) || 0
              unconfirmed_color = `rgba(46, 163, 221, ${percent})`
            } else {
              const maxPercent =
                (unconfirmed_blocks - unconfirmed_percentile.p75) /
                  (unconfirmed_percentile.max - unconfirmed_percentile.p75) /
                  1.5 || 0
              unconfirmed_color = `rgba(46, 163, 221, ${maxPercent})`
            }

            return (
              <div key={index} className={`bucket-item bucket-${index}`}>
                <div className='bucket-row bucket-title'>{index}</div>
                <div
                  className='bucket-row'
                  style={{ background: unconfirmed_color }}>
                  {unconfirmed_blocks_by_bucket[`bucket_${index}`] ?? ''}
                </div>
                <div className='bucket-row'>
                  {confirmation_latency_by_bucket[`bucket_${index}`]?.median
                    ? `${
                        confirmation_latency_by_bucket[`bucket_${index}`]
                          .median >= 1000
                          ? (
                              confirmation_latency_by_bucket[`bucket_${index}`]
                                .median / 1000
                            ).toFixed(1)
                          : confirmation_latency_by_bucket[`bucket_${index}`]
                              .median
                      }${
                        confirmation_latency_by_bucket[`bucket_${index}`]
                          .median >= 1000
                          ? 's'
                          : 'ms'
                      }`
                    : ''}
                </div>
                <div
                  className='bucket-row'
                  style={{ background: confirmed_color }}>
                  {confirmed_blocks || ''}
                </div>
              </div>
            )
          })}
        </div>
      </div>
      <Menu />
    </>
  )
}

LivePage.propTypes = {
  nanodb: ImmutablePropTypes.map.isRequired,
  get_blocks_confirmed_summary: PropTypes.func.isRequired,
  get_accounts_unconfirmed_summary: PropTypes.func.isRequired,
  get_blocks_unconfirmed_summary: PropTypes.func.isRequired
}
