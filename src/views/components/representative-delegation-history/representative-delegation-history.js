import React, { useEffect, useMemo } from 'react'
import ImmutablePropTypes from 'react-immutable-proptypes'
import PropTypes from 'prop-types'
import ReactEChartsCore from 'echarts-for-react/lib/core'
import * as echarts from 'echarts/core'
import { LineChart } from 'echarts/charts'
import {
  TooltipComponent,
  LegendComponent,
  GridComponent
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'

import { format_value } from '@core/utils'
import { build_delegation_history_series } from '#common/build-delegation-history-series.mjs'

echarts.use([
  LineChart,
  TooltipComponent,
  LegendComponent,
  GridComponent,
  CanvasRenderer
])

const WEIGHT_SERIES_NAME = 'Weight (Nano)'
const DELEGATORS_SERIES_NAME = 'Delegators (≥1 Nano)'

export default function RepresentativeDelegationHistory({
  account,
  get_account_delegation_history
}) {
  const account_address = account.get('account')
  useEffect(() => {
    if (account_address) {
      get_account_delegation_history(account_address)
    }
  }, [account_address, get_account_delegation_history])

  const delegation_history = account.get('delegation_history')
  const is_loading = account.get('account_is_loading_delegation_history')
  const { weight_series, delegators_series } = useMemo(
    () =>
      build_delegation_history_series({
        delegation_history: delegation_history.toJS()
      }),
    [delegation_history]
  )

  const option = {
    // points are UTC day buckets; local time would label them as the evening
    // before for viewers west of UTC
    useUTC: true,
    grid: {
      left: '60',
      right: '60',
      bottom: '30'
    },
    legend: {
      data: [WEIGHT_SERIES_NAME, DELEGATORS_SERIES_NAME]
    },
    tooltip: {
      trigger: 'axis',
      valueFormatter: (value) =>
        value === null || value === undefined
          ? '-'
          : Math.round(value).toLocaleString()
    },
    xAxis: {
      type: 'time',
      boundaryGap: false
    },
    yAxis: [
      {
        type: 'value',
        name: WEIGHT_SERIES_NAME,
        position: 'left',
        scale: true,
        axisLabel: {
          formatter: (value) => format_value({ value })
        }
      },
      {
        type: 'value',
        name: DELEGATORS_SERIES_NAME,
        position: 'right',
        scale: true,
        minInterval: 1,
        splitLine: { show: false },
        axisLabel: {
          formatter: (value) => format_value({ value })
        }
      }
    ],
    series: [
      {
        data: weight_series,
        name: WEIGHT_SERIES_NAME,
        type: 'line',
        yAxisIndex: 0,
        showSymbol: false,
        connectNulls: false,
        color: '#4A90E2'
      },
      {
        data: delegators_series,
        name: DELEGATORS_SERIES_NAME,
        type: 'line',
        yAxisIndex: 1,
        showSymbol: false,
        connectNulls: false,
        color: '#ff832b'
      }
    ]
  }

  return (
    <ReactEChartsCore
      echarts={echarts}
      option={option}
      showLoading={is_loading}
      loadingOption={{
        maskColor: 'rgba(255, 255, 255, 0)',
        text: '',
        spinnerRadius: 24,
        lineWidth: 2
      }}
      style={{ height: '350px', width: '100%' }}
    />
  )
}

RepresentativeDelegationHistory.propTypes = {
  account: ImmutablePropTypes.record.isRequired,
  get_account_delegation_history: PropTypes.func.isRequired
}
