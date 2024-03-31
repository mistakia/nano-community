import React from 'react'
import PropTypes from 'prop-types'
import BigNumber from 'bignumber.js'
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

import LedgerChartMetrics from '@components/ledger-chart-metrics'
import { download_csv, download_json } from '@core/utils'

echarts.use([
  TooltipComponent,
  LegendComponent,
  LineChart,
  CanvasRenderer,
  GridComponent
])

export default function LedgerChartVolume({ data, isLoading }) {
  const span_style =
    'float:right;margin-left:20px;font-size:14px;color:#666;font-weight:900'
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
      trigger: 'axis',
      formatter: (series) => {
        const values = series.map(
          (s) =>
            `${s.marker} ${
              s.seriesName
            } <span style="${span_style}">${BigNumber(s.data[1])
              .shiftedBy(-30)
              .toFormat(0)}</span>`
        )

        values.unshift(series[0].axisValueLabel)

        return values.join('<br/>')
      }
    },
    xAxis: {
      type: 'time'
    },
    yAxis: {
      type: 'value',
      name: 'Nano',
      axisLabel: {
        formatter: (value) => `${BigNumber(value).shiftedBy(-30).toFormat(0)}`
      }
    },
    series: [
      {
        type: 'line',
        name: 'Send',
        showSymbol: false,
        lineStyle: {
          width: 1
        },
        data: data.send_volume
      },
      {
        type: 'line',
        name: 'Change',
        showSymbol: false,
        lineStyle: {
          width: 1
        },
        data: data.change_volume
      }
    ]
  }

  const handle_download_csv = () => {
    const download_data = []
    data.send_volume.forEach((item, index) => {
      download_data.push({
        date: item[0],
        send_volume: item[1],
        change_volume: data.change_volume[index][1]
      })
    })

    download_csv({
      headers: ['Date', 'Send Volume', 'Change Volume'],
      data: download_data,
      file_name: 'nano-community-ledger-daily-volume-stats'
    })
  }

  const handle_download_json = () => {
    const download_data = []
    data.send_volume.forEach((item, index) => {
      download_data.push({
        date: item[0],
        send_volume: item[1],
        change_volume: data.change_volume[index][1]
      })
    })

    download_json({
      data: {
        title: 'Nano Community Ledger Daily Volume Stats',
        timestamp: new Date().toISOString(),
        data: download_data
      },
      file_name: 'nano-community-ledger-daily-volume-stats'
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
            The total amount sent (in Nano) and total amount of voting weight
            changed per day.
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
          data={data.send_volume.map((d) => [
            d[0],
            BigNumber(d[1]).shiftedBy(-30).toNumber()
          ])}
          label='Send Stats'
          show_total
        />
        <LedgerChartMetrics
          data={data.change_volume.map((d) => [
            d[0],
            BigNumber(d[1]).shiftedBy(-30).toNumber()
          ])}
          label='Change Stats'
          show_total
        />
      </div>
    </>
  )
}

LedgerChartVolume.propTypes = {
  data: PropTypes.object,
  isLoading: PropTypes.bool
}
