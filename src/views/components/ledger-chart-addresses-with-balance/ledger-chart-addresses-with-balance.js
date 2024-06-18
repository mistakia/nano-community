import React, { useEffect, useMemo } from 'react'
import PropTypes from 'prop-types'
import Button from '@mui/material/Button'
import ReactEChartsCore from 'echarts-for-react/lib/core'
import * as echarts from 'echarts/core'
import { LineChart } from 'echarts/charts'
import { TooltipComponent, GridComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'

import { download_csv, download_json } from '@core/utils'
import {
  base_ranges,
  base_range_labels,
  base_range_and_above_labels
} from '@core/constants'
import LedgerDescriptionNotice from '@components/ledger-description-notice'

echarts.use([LineChart, TooltipComponent, GridComponent, CanvasRenderer])

export default function LedgerChartAddressesWithBalance({
  data,
  isLoading,
  price_history,
  get_price_history,
  range,
  is_range_and_above
}) {
  const labels = is_range_and_above
    ? base_range_and_above_labels
    : base_range_labels
  useEffect(() => {
    if (price_history.length === 0) {
      get_price_history()
    }
  }, [])

  const handle_download_csv = () => {
    const download_data = []
    if (is_range_and_above) {
      const index = base_ranges.indexOf(range)
      const combined_ranges = base_ranges.slice(0, index + 1)
      const single_range_data = data[`${range}_account_count`]
      for (let i = 0; i < single_range_data.length; i++) {
        const single_range_item = single_range_data[i]
        let combined_value = 0
        for (let j = 0; j < combined_ranges.length; j++) {
          combined_value +=
            data[`${combined_ranges[j]}_account_count`][i][1] || 0
        }
        download_data.push({
          range: labels[range],
          date: single_range_item[0],
          account_count: combined_value
        })
      }
    } else {
      data[`${range}_account_count`].forEach((item) => {
        download_data.push({
          range: labels[range],
          date: item[0],
          account_count: item[1]
        })
      })
    }
    download_csv({
      headers: ['Range', 'Date', 'Account Count'],
      data: download_data,
      file_name: `nano-community-ledger-daily-addresses-with-balance-${labels[
        range
      ].toLowerCase()}`
    })
  }

  const handle_download_json = () => {
    let download_data
    if (is_range_and_above) {
      const index = base_ranges.indexOf(range)
      const combined_ranges = base_ranges.slice(0, index + 1)
      const single_range_data = data[`${range}_account_count`]
      const combined_data = single_range_data.map((single_range_item, i) => {
        let combined_value = 0
        for (let j = 0; j < combined_ranges.length; j++) {
          combined_value +=
            data[`${combined_ranges[j]}_account_count`][i][1] || 0
        }
        return {
          date: single_range_item[0],
          account_count: combined_value
        }
      })
      download_data = {
        title: `Nano Community Ledger Daily Addresses With Balance - ${labels[range]}`,
        data: combined_data
      }
    } else {
      download_data = {
        title: `Nano Community Ledger Daily Addresses With Balance - ${labels[range]}`,
        data: data[`${range}_account_count`].map((item) => ({
          date: item[0],
          account_count: item[1]
        }))
      }
    }
    download_json({
      data: download_data,
      file_name: `nano-community-ledger-daily-addresses-with-balance-${labels[
        range
      ].toLowerCase()}`
    })
  }

  const series_data_usd_price = useMemo(() => {
    const data = []
    price_history.forEach((item) => {
      data.push([item.timestamp_utc, item.price])
    })
    return data
  }, [price_history])

  const series_data = useMemo(() => {
    const combined_data = is_range_and_above
      ? []
      : data[`${range}_account_count`].map((item) => [item[0], item[1] || null])

    if (is_range_and_above) {
      const index = base_ranges.indexOf(range)
      const combined_ranges = base_ranges.slice(0, index + 1)
      const single_range_data = data[`${range}_account_count`]
      for (let i = 0; i < single_range_data.length; i++) {
        const single_range_item = single_range_data[i]
        let combined_value = 0
        for (let j = 0; j < combined_ranges.length; j++) {
          combined_value +=
            data[`${combined_ranges[j]}_account_count`][i][1] || 0
        }
        combined_data.push([single_range_item[0], combined_value || null])
      }
    }

    return {
      name: labels[range],
      type: 'line',
      lineStyle: {
        width: 2
      },
      showSymbol: false,
      data: combined_data
    }
  }, [data, range, is_range_and_above])

  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'cross',
        label: {
          backgroundColor: '#6a7985'
        }
      }
    },
    legend: {
      bottom: 0
    },
    xAxis: [
      {
        type: 'time',
        boundaryGap: false
      }
    ],
    yAxis: [
      {
        type: 'value'
      },
      {
        type: 'log',
        position: 'right',
        axisLabel: {
          formatter: '{value} USD'
        }
      }
    ],
    series: [
      series_data,
      {
        name: 'USD Price',
        type: 'line',
        yAxisIndex: 1,
        data: series_data_usd_price,
        showSymbol: false,
        lineStyle: {
          width: 2,
          color: '#333333'
        }
      }
    ]
  }

  return (
    <>
      <ReactEChartsCore
        echarts={echarts}
        option={option}
        showLoading={isLoading}
        loadingOption={{
          maskColor: 'rgba(255, 255, 255, 0)',
          text: '',
          spinnerRadius: 24,
          lineWidth: 2
        }}
        style={{ width: '100%', height: '600px' }}
      />
      <div className='ledger__chart-description'>
        <div className='section__heading'>
          <span>Description</span>
        </div>
        <div className='ledger__chart-section-body description'>
          <p>The number of unique addresses holding {labels[range]} Nano.</p>
        </div>
        <LedgerDescriptionNotice />
        {!isLoading && (
          <div className='ledger__chart-section-body download'>
            <Button size='small' onClick={handle_download_csv}>
              Download CSV
            </Button>
            <Button size='small' onClick={handle_download_json}>
              Download JSON
            </Button>
          </div>
        )}
      </div>
    </>
  )
}

LedgerChartAddressesWithBalance.propTypes = {
  data: PropTypes.object.isRequired,
  isLoading: PropTypes.bool.isRequired,
  price_history: PropTypes.array.isRequired,
  get_price_history: PropTypes.func.isRequired,
  range: PropTypes.string,
  is_range_and_above: PropTypes.bool
}
