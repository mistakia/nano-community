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
  _1000000_count: '#ffd700', // Gold
  _100000_count: '#f9c74f', // Maize Crayola
  _10000_count: '#f4a261', // Sandy Brown
  _1000_count: '#e63946', // Red

  // medium
  _100_count: '#0077b6', // Star Command Blue
  _10_count: '#023e8a', // Royal Blue Dark
  _1_count: '#0096c7', // Pacific Blue

  // low
  _01_count: '#6DB65B', // Apple Green
  _001_count: '#57A55A', // Medium Sea Green
  _0001_count: '#3D8B57', // Jungle Green
  _00001_count: '#2C6E49', // Bottle Green

  // micro
  _000001_count: '#911eb4', // Purple
  _000001_below_count: '#dcbeff' // Lavender Blush
}

export default function LedgerChartAmounts({ data, isLoading }) {
  const ranges = {
    _1000000_count: '>1M',
    _100000_count: '100k to 1M',
    _10000_count: '10k to 100k',
    _1000_count: '1k to 10k',
    _100_count: '100 to 1k',
    _10_count: '10 to 100',
    _1_count: '1 to 10',
    _01_count: '0.1 to 1',
    _001_count: '0.01 to 0.1',
    _0001_count: '0.001 to 0.01',
    _00001_count: '0.0001 to 0.001',
    _000001_count: '0.00001 to 0.0001',
    _000001_below_count: '<0.00001'
  }

  const series_data = Object.entries(ranges).map(([key, value], index) => {
    const color = color_map[key]

    return {
      name: value,
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
      data: data[key].map((item) => [item[0], item[1]])
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
    Object.entries(ranges).forEach(([key, value]) => {
      data[key].forEach((item) => {
        download_data.push({
          range: value,
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

    Object.entries(ranges).forEach(([key, value]) => {
      download_data.data[value] = data[key].map((item) => ({
        date: item[0],
        count: item[1]
      }))
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
      <div className='ledger__chart-sections'>
        <div className='ledger__chart-section'>
          <div className='section__heading'>
            <span>Description</span>
          </div>
          <div className='ledger__chart-section-body description'>
            The number of confirmed send-type blocks per day where the amount in
            the block is in a given range (in Nano)
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
      </div>
    </>
  )
}

LedgerChartAmounts.propTypes = {
  data: PropTypes.object,
  isLoading: PropTypes.bool
}
