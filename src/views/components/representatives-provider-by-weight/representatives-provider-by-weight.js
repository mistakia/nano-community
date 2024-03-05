import React from 'react'
import PropTypes from 'prop-types'
import { useTranslation } from 'react-i18next'

import MetricCard from '@components/metric-card'

export default function RepresentativesProviderByWeight({ metrics }) {
  const { t } = useTranslation()
  return (
    <MetricCard
      title={t('representatives_provider_by_weight.title', 'Hosting Provider')}
      subtitle={t('common.by_online_weight', 'By Online Weight')}
      unit='%'
      max={100}
      field='network.asname'
      metrics={metrics}
    />
  )
}

RepresentativesProviderByWeight.propTypes = {
  metrics: PropTypes.array
}
