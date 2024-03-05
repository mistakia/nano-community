import React from 'react'
import PropTypes from 'prop-types'
import { useTranslation } from 'react-i18next'

import MetricCard from '@components/metric-card'

export default function RepresentativesCheckedByWeight({ metrics }) {
  const { t } = useTranslation()
  return (
    <MetricCard
      title={t(
        'representatives_checked_by_weight.title',
        'Blocks Differential'
      )}
      subtitle={t('common.by_online_weight', 'By Online Weight')}
      tooltip={t(
        'representatives_checked_by_weight.tooltip',
        'Displays the amount of voting weight that is within X number of blocks from the leading node. Useful for getting a sense of how in-sync block propagation is within the network'
      )}
      unit='%'
      max={100}
      field='telemetry.block_behind'
      metrics={metrics}
    />
  )
}

RepresentativesCheckedByWeight.propTypes = {
  metrics: PropTypes.array
}
