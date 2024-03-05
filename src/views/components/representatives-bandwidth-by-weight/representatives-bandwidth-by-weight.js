import React from 'react'
import PropTypes from 'prop-types'
import { useTranslation } from 'react-i18next'

import MetricCard from '@components/metric-card'

export default function RepresentativesBandwidthByWeight({ metrics }) {
  const { t } = useTranslation()
  return (
    <MetricCard
      title={t('common.bandwidth_limit', 'Bandwidth Limit')}
      subtitle={t('common.by_online_weight', 'By Online Weight')}
      tooltip={t(
        'representatives_bandwidth_by_weight.tooltip',
        'Displays the amount of voting weight based on the bandwidth limit set locally by each node'
      )}
      unit='%'
      max={100}
      field='telemetry.bandwidth_cap'
      metrics={metrics}
    />
  )
}

RepresentativesBandwidthByWeight.propTypes = {
  metrics: PropTypes.array
}
