import React from 'react'
import PropTypes from 'prop-types'
import ReactEChartsCore from 'echarts-for-react/lib/core'
import BigNumber from 'bignumber.js'
import * as echarts from 'echarts/core'
import { LineChart } from 'echarts/charts'
import {
  TooltipComponent,
  LegendComponent,
  GridComponent
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import Button from '@mui/material/Button'

import LedgerChartMetrics from '@components/ledger-chart-metrics'
import { download_csv, download_json, format_value } from '@core/utils'

echarts.use([
  TooltipComponent,
  LegendComponent,
  LineChart,
  CanvasRenderer,
  GridComponent
])

export default function LedgerUSDTransferred({ data, isLoading }) {
  const span_style =
    'float:right;margin-left:20px;font-size:14px;color:#666;font-weight:900'

  const option = {
    grid: {
      left: '3%',
      right: '4%',
      containLabel: true
    },
    legend: {
      show: true,
      bottom: 0
    },
    tooltip: {
      className: 'echarts-tooltip',
      trigger: 'axis',
      formatter: (series) => {
        const values = series.map(
          (s) =>
            `${s.marker} ${
              s.seriesName
            } <span style="${span_style}">$${BigNumber(s.data[1]).toFormat(
              2
            )}</span>`
        )

        values.unshift(series[0].axisValueLabel)

        return values.join('<br/>')
      }
    },
    xAxis: {
      type: 'time'
    },
    yAxis: {
      type: 'log',
      min: 1,
      name: 'Nano',
      axisLabel: {
        formatter: (value) => format_value({ prefix: '$', value })
      }
    },
    series: [
      {
        type: 'line',
        name: 'USD Transferred',
        showSymbol: false,
        lineStyle: {
          width: 1
        },
        data: data.total_usd_send_value
      }
    ]
  }

  const handle_download_csv = () => {
    const download_data = data.total_usd_send_value.map((d) => ({
      date: d[0],
      value: d[1]
    }))

    download_csv({
      headers: ['Date', 'USD Transferred'],
      data: download_data,
      file_name: 'nano-community-ledger-daily-usd-transferred'
    })
  }

  const handle_download_json = () => {
    const download_data = data.total_usd_send_value.map((d) => ({
      date: d[0],
      value: d[1]
    }))

    download_json({
      data: {
        title: 'Nano Community Ledger Daily USD Transferred',
        timestamp: new Date().toISOString(),
        data: download_data
      },
      file_name: 'nano-community-ledger-daily-usd-transferred'
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
            <p>The total amount of value transferred (in USD) per day.</p>
            <p>
              Based on the daily closing price of Nano/USD and the total amount
              of Nano transferred that day.
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
          data={data.total_usd_send_value.map((d) => [d[0], d[1]])}
          label='USD Transferred Stats'
          show_total
        />
      </div>
    </>
  )
}

LedgerUSDTransferred.propTypes = {
  data: PropTypes.object,
  isLoading: PropTypes.bool
}
