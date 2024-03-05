import React from 'react'
import PropTypes from 'prop-types'
import { useTranslation } from 'react-i18next'

import MetricCard from '@components/metric-card'

export default function RepresentativesVersionByWeight({ metrics }) {
  const { t } = useTranslation()
  return (
    <MetricCard
      title={t('representatives_version_by_weight.title', 'Versions')}
      subtitle={t('common.by_online_weight', 'By Online Weight')}
      unit='%'
      max={100}
      field='version'
      metrics={metrics}
    />
  )
}

RepresentativesVersionByWeight.propTypes = {
  metrics: PropTypes.array
}
