import React, { useEffect, useMemo } from 'react'
import ImmutablePropTypes from 'react-immutable-proptypes'
import PropTypes from 'prop-types'
import ReactEChartsCore from 'echarts-for-react/lib/core'
import * as echarts from 'echarts/core'

import { format_value } from '@core/utils'
import { build_account_balance_history_series } from '#common/build-account-balance-history-series.mjs'

// The latest point at or before the timestamp, as a step line shows it; the
// first point when the timestamp precedes the series. Points are ascending.
const find_point_at_or_before = ({ series_data, timestamp }) => {
  let found_point = series_data[0]
  for (const point of series_data) {
    if (new Date(point[0]).valueOf() > timestamp) {
      break
    }
    found_point = point
  }
  return found_point
}

export default function AccountBalanceHistory({
  account,
  get_account_balance_history,
  get_price_history,
  price_history
}) {
  const account_address = account.get('account')
  useEffect(() => {
    if (account_address) {
      get_account_balance_history(account_address)
    }
  }, [account_address, get_account_balance_history])

  useEffect(() => {
    get_price_history()
  }, [get_price_history])

  const balance_history = account.get('balance_history')
  const is_loading = account.get('account_is_loading_balance_history')
  const { balance_series, usd_value_series, usd_price_series } = useMemo(
    () =>
      build_account_balance_history_series({
        balance_history: balance_history.toJS(),
        price_history,
        now: new Date()
      }),
    [balance_history, price_history]
  )

  const series = [
    {
      data: balance_series,
      name: 'Balance (Nano)',
      type: 'line',
      step: 'end',
      areaStyle: {},
      yAxisIndex: 0,
      showSymbol: false,
      color: '#4A90E2'
    },
    {
      data: usd_value_series,
      name: 'USD Value',
      type: 'line',
      yAxisIndex: 1,
      showSymbol: false,
      color: '#da1e28'
    },
    {
      data: usd_price_series,
      name: 'USD Price',
      type: 'line',
      yAxisIndex: 2,
      showSymbol: false,
      color: '#ff832b'
    }
  ]

  const option = {
    grid: {
      left: '50',
      right: '90', // Adjusted to account for the two axes on the right
      bottom: '30'
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'cross',
        label: {
          backgroundColor: '#6a7985'
        }
      },
      formatter: (params) => {
        // The datetime where the axisPointer is
        const x_time = new Date(params[0].axisValue)

        let tooltip = `<p>${x_time.toDateString()}</p> `
        series.forEach((serie) => {
          const point = find_point_at_or_before({
            series_data: serie.data,
            timestamp: x_time.valueOf()
          })
          const value = point ? point[1] : '-'

          // add the colored circle at the beginning of the line
          tooltip += `<p><span style="display:inline-block;margin-right:5px;border-radius:10px;width:9px;height:9px;background-color: ${serie.color}"></span>`
          // add the serie's name and its value
          tooltip += `${serie.name} &emsp;&emsp; <b>${value}</b></p>`
        })
        return tooltip
      }
    },
    xAxis: {
      type: 'time',
      boundaryGap: false
    },
    yAxis: [
      {
        type: 'value',
        name: 'Balance (Nano)',
        position: 'left',
        axisLabel: {
          formatter: (value) => format_value({ value })
        }
      },
      {
        type: 'value',
        name: 'USD Value',
        position: 'right',
        axisLabel: {
          formatter: (value) => format_value({ prefix: '$', value })
        }
      },
      {
        type: 'value',
        name: 'Price',
        position: 'right',
        offset: 50, // Offset to separate from the USD Value axis
        axisLabel: {
          formatter: (value) => format_value({ prefix: '$', value })
        }
      }
    ],
    series
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

AccountBalanceHistory.propTypes = {
  account: ImmutablePropTypes.record.isRequired,
  get_account_balance_history: PropTypes.func.isRequired,
  get_price_history: PropTypes.func.isRequired,
  price_history: PropTypes.array.isRequired
}
