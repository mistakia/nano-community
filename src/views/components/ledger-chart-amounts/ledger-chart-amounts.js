import React from 'react'
import PropTypes from 'prop-types'
import ReactEChartsCore from 'echarts-for-react/lib/core'
import * as echarts from 'echarts/core'
import { LineChart, BarChart } from 'echarts/charts'
import {
  TooltipComponent,
  LegendComponent,
  GridComponent,
  DatasetComponent
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import Button from '@mui/material/Button'

import { download_csv, download_json } from '@core/utils'
import { base_ranges, base_range_labels } from '@core/constants'

echarts.use([
  TooltipComponent,
  LegendComponent,
  LineChart,
  BarChart,
  CanvasRenderer,
  GridComponent,
  DatasetComponent
])

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

export default function LedgerChartAmounts({ data, isLoading }) {
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
        color
      },
      emphasis: {
        focus: 'series'
      },
      data: data[`${key}_count`].map((item) => [item[0], item[1]])
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
    grid: {
      left: '3%',
      right: '4%',
      containLabel: true
    },
    xAxis: [
      {
        type: 'time',
        boundaryGap: false
      }
    ],
    yAxis: [
      {
        type: 'log',
        min: 1,
        max: 5000000
      }
    ],
    series: series_data
  }

  const handle_download_csv = () => {
    const download_data = []
    base_ranges.forEach((key) => {
      data[`${key}_count`].forEach((item) => {
        download_data.push({
          range: base_range_labels[key],
          date: item[0],
          count: item[1]
        })
      })
    })

    download_csv({
      headers: ['Range', 'Date', 'Count'],
      data: download_data,
      file_name: 'nano-community-ledger-daily-block-counts-by-amount-range'
    })
  }

  const handle_download_json = () => {
    const download_data = {
      title: 'Nano Community Ledger Daily Block Counts by Amount Range',
      data: {}
    }

    base_ranges.forEach((key) => {
      download_data.data[base_range_labels[key]] = data[`${key}_count`].map(
        (item) => ({
          date: item[0],
          count: item[1]
        })
      )
    })

    download_json({
      data: download_data,
      file_name: 'nano-community-ledger-daily-block-counts-by-amount-range'
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
            The number of confirmed send-type blocks per day where the amount in
            the block is in a given range (in Nano).
          </p>
        </div>
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

LedgerChartAmounts.propTypes = {
  data: PropTypes.object,
  isLoading: PropTypes.bool
}
