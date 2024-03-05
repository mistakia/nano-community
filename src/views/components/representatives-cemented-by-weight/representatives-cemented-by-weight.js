import React from 'react'
import PropTypes from 'prop-types'
import { useTranslation } from 'react-i18next'

import MetricCard from '@components/metric-card'

export default function RepresentativesCementedByWeight({ metrics }) {
  const { t } = useTranslation()
  return (
    <MetricCard
      title={t(
        'representatives_cemented_by_weight.title',
        'Confirmation Differential'
      )}
      subtitle={t('common.by_online_weight', 'By Online Weight')}
      tooltip={t(
        'representatives_cemented_by_weight.tooltip',
        'Displays the amount of voting weight that is within X number of confirmations from the leading node. Helpful in knowing how well in-sync and aligned nodes are across the network'
      )}
      unit='%'
      max={100}
      field='telemetry.cemented_behind'
      metrics={metrics}
    />
  )
}

RepresentativesCementedByWeight.propTypes = {
  metrics: PropTypes.array
}
