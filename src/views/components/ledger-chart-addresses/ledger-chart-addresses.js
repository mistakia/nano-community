import React from 'react'
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
import Button from '@mui/material/Button'

import { download_csv, download_json } from '@core/utils'
import LedgerChartMetrics from '@components/ledger-chart-metrics'

echarts.use([
  TooltipComponent,
  LegendComponent,
  LineChart,
  CanvasRenderer,
  GridComponent
])

export default function LedgerChartAddresses({ data, isLoading }) {
  const option = {
    grid: {
      containLabel: true
    },
    legend: {
      show: true,
      bottom: 0
    },
    tooltip: {
      className: 'echarts-tooltip',
      trigger: 'axis'
    },
    xAxis: {
      type: 'time'
    },
    yAxis: {
      type: 'log',
      name: 'Addresses',
      min: 1
    },
    series: [
      {
        type: 'line',
        showSymbol: false,
        name: 'Active',
        lineStyle: {
          width: 1
        },
        data: data.active_addresses
      },
      {
        type: 'line',
        showSymbol: false,
        name: 'Reused',
        lineStyle: {
          width: 1
        },
        data: data.reused_addresses
      },
      {
        type: 'line',
        showSymbol: false,
        name: 'New',
        lineStyle: {
          width: 1
        },
        data: data.open_count
      }
    ]
  }

  const handle_download_csv = () => {
    const download_data = []
    for (let i = 0; i < data.active_addresses.length; i++) {
      download_data.push({
        date: data.active_addresses[i][0],
        active: data.active_addresses[i][1],
        reused: data.reused_addresses[i][1],
        new: data.open_count[i][1]
      })
    }

    download_csv({
      headers: ['Date', 'Active', 'Reused', 'New'],
      data: download_data,
      file_name: 'nano-community-ledger-addresses'
    })
  }

  const handle_download_json = () => {
    const download_data = []

    for (let i = 0; i < data.active_addresses.length; i++) {
      download_data.push({
        date: data.active_addresses[i][0],
        active: data.active_addresses[i][1],
        reused: data.reused_addresses[i][1],
        new: data.open_count[i][1]
      })
    }

    download_json({
      data: {
        title: 'Nano Community Daily Ledger Address Stats',
        timestamp: new Date().toISOString(),
        data: download_data
      },
      file_name: 'nano-community-ledger-addresses'
    })
  }

  return (
    <>
      <ReactEChartsCore
        echarts={echarts}
        option={option}
        showLoading={isLoading}
        loadingOption={{ maskColor: 'rgba(255, 255, 255, 0)', text: '' }}
        style={{ width: '100%', height: '400px' }}
      />
      <div className='ledger__chart-sections'>
        <div className='ledger__chart-section'>
          <div className='section__heading'>
            <span>Description</span>
          </div>
          <div className='ledger__chart-section-body description'>
            <p>
              The total number of active, new, and reused addresses used per
              day.
            </p>
            <p>
              Active shows the number of unique addresses used. New shows the
              number of addresses created. Reused shows the number of addresses
              used that were created on a previous day.
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
        <LedgerChartMetrics
          data={data.active_addresses}
          label='Active Address Stats'
        />
        <LedgerChartMetrics data={data.open_count} label='New Address Stats' />
      </div>
    </>
  )
}

LedgerChartAddresses.propTypes = {
  data: PropTypes.object,
  isLoading: PropTypes.bool
}
