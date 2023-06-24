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

import LedgerChartMetrics from '@components/ledger-chart-metrics'

echarts.use([
  TooltipComponent,
  LegendComponent,
  LineChart,
  CanvasRenderer,
  GridComponent
])

export default class LedgerUSDTransferred extends React.Component {
  render() {
    const { data, isLoading } = this.props

    const spanStyle =
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
              } <span style="${spanStyle}">$${BigNumber(s.data[1]).toFormat(
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
        type: 'value',
        name: 'Nano',
        axisLabel: {
          formatter: (value) => `$${value}`
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
              <p>The total amount of value transferred (in USD) per day.</p>
              <p>
                Based on the daily closing price of Nano/USD and the total
                amount of Nano transferred that day.
              </p>
            </div>
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
}

LedgerUSDTransferred.propTypes = {
  data: PropTypes.object,
  isLoading: PropTypes.bool
}
