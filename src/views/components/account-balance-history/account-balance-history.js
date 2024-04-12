import React, { useEffect, useMemo } from 'react'
import BigNumber from 'bignumber.js'
import ImmutablePropTypes from 'react-immutable-proptypes'
import PropTypes from 'prop-types'
import ReactEChartsCore from 'echarts-for-react/lib/core'
import * as echarts from 'echarts/core'

import { format_value } from '@core/utils'

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

  const balance_history = account.get('balance_history').toJS()
  const is_loading = account.get('account_is_loading_balance_history')
  const [series_data, series_data_usd, series_data_usd_price] = useMemo(() => {
    const balance_data = balance_history.map((entry) => [
      entry.date,
      new BigNumber(entry.balance).shiftedBy(-30).toNumber()
    ])

    let balance_data_usd = []
    let balance_data_usd_price = []
    if (balance_history.length > 0) {
      const min_date_entry = balance_history[0]
      const max_date_entry = balance_history[balance_history.length - 1]
      const filled_dates = []
      for (
        let day = min_date_entry.date_unix * 1000;
        day <= max_date_entry.date_unix * 1000;
        day += 86400000
      ) {
        filled_dates.push(new Date(day).toISOString().split('T')[0])
      }

      const reversed_balance_history = balance_history.reverse()

      balance_data_usd = filled_dates.map((date) => {
        const balance_entry = reversed_balance_history.find(
          (entry) => entry.date_unix * 1000 < new Date(date).getTime()
        )
        const price_entry = price_history.find(
          (entry) => entry.timestamp_utc === `${date}T00:00:00.000Z`
        )
        const balance = new BigNumber(
          balance_entry ? balance_entry.balance : 0
        ).shiftedBy(-30)
        const usd_value = price_entry
          ? balance.multipliedBy(price_entry.price).toFixed(2)
          : null

        if (price_entry) {
          balance_data_usd_price.push([
            date,
            new BigNumber(price_entry.price).toFixed(2)
          ])
        }
        return [date, usd_value]
      })
    }

    return [balance_data, balance_data_usd, balance_data_usd_price]
  }, [balance_history, price_history])

  const series = [
    {
      data: series_data,
      name: 'Balance (Nano)',
      type: 'line',
      step: 'end',
      areaStyle: {},
      yAxisIndex: 0,
      showSymbol: false,
      color: '#4A90E2'
    },
    {
      data: series_data_usd,
      name: 'USD Value',
      type: 'line',
      yAxisIndex: 1,
      showSymbol: false,
      color: '#da1e28'
    },
    {
      data: series_data_usd_price,
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
        var x_time = new Date(params[0].axisValue)

        let tooltip = `<p>${x_time.toDateString()}</p> `
        series.forEach((serie) => {
          // find the closest value
          const value = serie.data.reduce((prev, curr) =>
            Math.abs(new Date(curr[0]).valueOf() - x_time.valueOf()) <
            Math.abs(new Date(prev[0]).valueOf() - x_time.valueOf())
              ? curr
              : prev
          )[1]

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
      notMerge={true}
      lazyUpdate={true}
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
