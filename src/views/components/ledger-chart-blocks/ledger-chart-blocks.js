import React from 'react'
import PropTypes from 'prop-types'
import Button from '@mui/material/Button'
import ReactEChartsCore from 'echarts-for-react/lib/core'
import * as echarts from 'echarts/core'
import { LineChart } from 'echarts/charts'
import {
  TooltipComponent,
  LegendComponent,
  GridComponent
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'

import LedgerChartMetrics from '@components/ledger-chart-metrics'
import { download_csv, download_json } from '@core/utils'

echarts.use([
  TooltipComponent,
  LegendComponent,
  LineChart,
  CanvasRenderer,
  GridComponent
])

export default function LedgerChartBlocks({ data, isLoading }) {
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
      name: 'Blocks',
      min: 1
    },
    series: [
      {
        type: 'line',
        name: 'Total',
        showSymbol: false,
        lineStyle: {
          width: 1
        },
        data: data.blocks
      },
      {
        type: 'line',
        name: 'Send',
        showSymbol: false,
        lineStyle: {
          width: 1
        },
        data: data.send_count
      },
      {
        type: 'line',
        name: 'Change',
        showSymbol: false,
        lineStyle: {
          width: 1
        },
        data: data.change_count
      },
      {
        type: 'line',
        name: 'Receive',
        showSymbol: false,
        lineStyle: {
          width: 1
        },
        data: data.open_count
      },
      {
        type: 'line',
        name: 'Open',
        showSymbol: false,
        lineStyle: {
          width: 1
        },
        data: data.receive_count
      }
    ]
  }

  const handle_download_csv = () => {
    const download_data = []
    for (let i = 0; i < data.blocks.length; i++) {
      download_data.push({
        date: data.blocks[i][0],
        blocks: data.blocks[i][1],
        send: data.send_count[i][1],
        change: data.change_count[i][1],
        receive: data.receive_count[i][1],
        open: data.open_count[i][1]
      })
    }

    download_csv({
      headers: ['Date', 'Blocks', 'Send', 'Change', 'Receive', 'Open'],
      data: download_data,
      file_name: 'nano-community-ledger-blocks'
    })
  }

  const handle_download_json = () => {
    const download_data = []

    for (let i = 0; i < data.blocks.length; i++) {
      download_data.push({
        date: data.blocks[i][0],
        blocks: data.blocks[i][1],
        send: data.send_count[i][1],
        change: data.change_count[i][1],
        receive: data.receive_count[i][1],
        open: data.open_count[i][1]
      })
    }

    download_json({
      data: {
        title: 'Nano Community Daily Ledger Block Counts',
        timestamp: new Date().toISOString(),
        data: download_data
      },
      file_name: 'nano-community-ledger-blocks'
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
            The number of confirmed blocks (by type) per day.
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
          data={data.blocks}
          label='Total Block Stats'
          show_total
        />
        <LedgerChartMetrics
          data={data.send_count}
          label='Send Block Stats'
          show_total
        />
        <LedgerChartMetrics
          data={data.receive_count}
          label='Receive Block Stats'
          show_total
        />
        <LedgerChartMetrics
          data={data.open_count}
          label='Open Block Stats'
          show_total
        />
        <LedgerChartMetrics
          data={data.change_count}
          label='Change Block Stats'
          show_total
        />
      </div>
    </>
  )
}

LedgerChartBlocks.propTypes = {
  data: PropTypes.object,
  isLoading: PropTypes.bool
}
