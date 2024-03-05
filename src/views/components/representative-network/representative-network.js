import React from 'react'
import ImmutablePropTypes from 'react-immutable-proptypes'
import { useTranslation } from 'react-i18next'

export default function RepresentativeNetwork({ account }) {
  const { t } = useTranslation()
  const items = [
    {
      label: t('representative_network.provider', 'Provider'),
      value: account.getIn(['network', 'asname'])
    },
    {
      label: t('representative_network.isp', 'ISP'),
      value: account.getIn(['network', 'isp'])
    },
    {
      label: t('common.country', 'Country'),
      value: account.getIn(['network', 'country'])
    },
    {
      label: t('representative_network.city', 'City'),
      value: account.getIn(['network', 'city'])
    }
  ]

  const rows = items.map((i, idx) => (
    <div className='section__row' key={idx}>
      <div className='section__row-label'>{i.label}</div>
      <div className='section__row-value'>{i.value}</div>
    </div>
  ))

  return (
    <div className='representative__section representative__network'>
      <div className='section__heading'>
        <span>{t('representative_network.network', 'Network')}</span>
      </div>
      {rows}
    </div>
  )
}

RepresentativeNetwork.propTypes = {
  account: ImmutablePropTypes.record
}
