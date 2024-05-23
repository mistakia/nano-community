import React, { useEffect, useMemo } from 'react'
import PropTypes from 'prop-types'
import Button from '@mui/material/Button'
import ReactEChartsCore from 'echarts-for-react/lib/core'
import * as echarts from 'echarts/core'
import { LineChart } from 'echarts/charts'
import { TooltipComponent, GridComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'

import { base_ranges, base_range_labels } from '@core/constants'
import { download_csv, download_json } from '@core/utils'
import LedgerDescriptionNotice from '@components/ledger-description-notice'

echarts.use([LineChart, TooltipComponent, GridComponent, CanvasRenderer])

const color_map = {
  // high
  _1000000: '#ffd700', // Gold
  _100000: '#f9c74f', // Maize Crayola
  _10000: '#f4a261', // Sandy Brown
  _1000: '#e63946', // Red

  // medium
  _100: '#0077b6', // Star Command Blue
  _10: '#023e8a', // Royal Blue Dark
  _1: '#0096c7', // Pacific Blue

  // low
  _01: '#6DB65B', // Apple Green
  _001: '#57A55A', // Medium Sea Green
  _0001: '#3D8B57', // Jungle Green
  _00001: '#2C6E49', // Bottle Green

  // micro
  _000001: '#911eb4', // Purple
  _000001_below: '#dcbeff' // Lavender Blush
}

export default function LedgerChartDistribution({
  data,
  isLoading,
  price_history,
  get_price_history
}) {
  useEffect(() => {
    if (price_history.length === 0) {
      get_price_history()
    }
  }, [])

  const series_data_usd_price = useMemo(() => {
    const data = []
    price_history.forEach((item) => {
      data.push([item.timestamp_utc, item.price])
    })
    return data
  }, [price_history])

  const series_data = base_ranges.map((key) => {
    const color = color_map[key]

    return {
      name: base_range_labels[key],
      type: 'line',
      stack: 'total',
      color,
      lineStyle: {
        width: 0
      },
      showSymbol: false,
      areaStyle: {
        color,
        opacity: 0.6
      },
      emphasis: {
        focus: 'series'
      },
      data: data[`${key}_relative_supply`].map((item) => [item[0], item[1]])
    }
  })

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
        type: 'value',
        min: 0,
        max: 100,
        axisLabel: {
          formatter: '{value} %'
        }
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
      ...series_data,
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

  const handle_download_csv = () => {
    const download_data = []
    base_ranges.forEach((key) => {
      data[`${key}_relative_supply`].forEach((item) => {
        download_data.push({
          range: base_range_labels[key],
          date: item[0],
          relative_supply: item[1]
        })
      })
    })

    download_csv({
      headers: ['Range', 'Date', 'Relative Supply'],
      data: download_data,
      file_name: 'nano-community-ledger-daily-relative-balance-distribution'
    })
  }

  const handle_download_json = () => {
    const download_data = {
      title: 'Nano Community Ledger Daily Relative Balance Distribution',
      data: {}
    }

    base_ranges.forEach((key) => {
      download_data.data[base_range_labels[key]] = data[
        `${key}_relative_supply`
      ].map((item) => ({
        date: item[0],
        relative_supply: item[1]
      }))
    })
    download_json({
      data: download_data,
      file_name: 'nano-community-ledger-daily-relative-balance-distribution'
    })
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
            The relative distribution of the supply held by addresses within
            specific balance ranges.
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

LedgerChartDistribution.propTypes = {
  data: PropTypes.object.isRequired,
  isLoading: PropTypes.bool.isRequired,
  price_history: PropTypes.array.isRequired,
  get_price_history: PropTypes.func.isRequired
}
