import React, { useEffect, useMemo } from 'react'
import PropTypes from 'prop-types'
import Button from '@mui/material/Button'
import ReactEChartsCore from 'echarts-for-react/lib/core'
import * as echarts from 'echarts/core'
import { LineChart } from 'echarts/charts'
import { TooltipComponent, GridComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'

import { download_csv, download_json } from '@core/utils'
import { base_range_labels } from '@core/constants'
import LedgerDescriptionNotice from '@components/ledger-description-notice'

echarts.use([LineChart, TooltipComponent, GridComponent, CanvasRenderer])

export default function LedgerChartAddressesWithBalance({
  data,
  isLoading,
  price_history,
  get_price_history,
  range
}) {
  useEffect(() => {
    if (price_history.length === 0) {
      get_price_history()
    }
  }, [])

  const handle_download_csv = () => {
    const download_data = []
    data[`${range}_account_count`].forEach((item) => {
      download_data.push({
        range: base_range_labels[range],
        date: item[0],
        account_count: item[1]
      })
    })
    download_csv({
      headers: ['Range', 'Date', 'Account Count'],
      data: download_data,
      file_name: `nano-community-ledger-daily-addresses-with-balance-${base_range_labels[
        range
      ].toLowerCase()}`
    })
  }

  const handle_download_json = () => {
    const download_data = {
      title: `Nano Community Ledger Daily Addresses With Balance - ${base_range_labels[range]}`,
      data: data[`${range}_account_count`].map((item) => ({
        date: item[0],
        account_count: item[1]
      }))
    }
    download_json({
      data: download_data,
      file_name: `nano-community-ledger-daily-addresses-with-balance-${base_range_labels[
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
    return {
      name: base_range_labels[range],
      type: 'line',
      lineStyle: {
        width: 2
      },
      showSymbol: false,
      data: data[`${range}_account_count`].map((item) => [item[0], item[1]])
    }
  }, [data, range])

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
          <p>
            The number of unique addresses holding {base_range_labels[range]}{' '}
            Nano.
          </p>
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
  range: PropTypes.string
}
