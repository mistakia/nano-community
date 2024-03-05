import React from 'react'
import PropTypes from 'prop-types'
import { useTranslation } from 'react-i18next'

import MetricCard from '@components/metric-card'

export default function RepresentativesCountryByWeight({ metrics }) {
  const { t } = useTranslation()
  return (
    <MetricCard
      title={t('representatives_country_by_weight.title', 'Country')}
      subtitle={t('common.by_online_weight', 'By Online Weight')}
      unit='%'
      max={100}
      field='network.country'
      metrics={metrics}
    />
  )
}

RepresentativesCountryByWeight.propTypes = {
  metrics: PropTypes.array
}
