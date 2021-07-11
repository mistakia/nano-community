import React from 'react'
import PropTypes from 'prop-types'
import BigNumber from 'bignumber.js'
import ReactEChartsCore from 'echarts-for-react/lib/core'
import * as echarts from 'echarts/core'
import { LineChart } from 'echarts/charts'
import { TooltipComponent, LegendComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'

import LedgerChartMetrics from '@components/ledger-chart-metrics'

echarts.use([TooltipComponent, LegendComponent, LineChart, CanvasRenderer])

export default class LedgerChartBlocks extends React.Component {
  render() {
    const { data } = this.props

    const spanStyle =
      'float:right;margin-left:20px;font-size:14px;color:#666;font-weight:900'
    const option = {
      legend: {
        show: true,
        bottom: 0
      },
      tooltip: {
        trigger: 'axis',
        formatter: (series) =>
          series
            .map(
              (s) =>
                `${s.marker} ${
                  s.seriesName
                } <span style="${spanStyle}">${BigNumber(s.data[1])
                  .shiftedBy(-30)
                  .toFormat(0)}</span>`
            )
            .join('<br/>')
      },
      xAxis: {
        type: 'time'
      },
      yAxis: {
        type: 'value',
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

    return (
      <>
        <ReactEChartsCore
          echarts={echarts}
          option={option}
          style={{ width: '100%', height: '400px' }}
        />
        <div className='ledger__chart-sections'>
          <div className='ledger__chart-section'>
            <div className='ledger__chart-section-heading'>
              <span>Description</span>
            </div>
            <div className='ledger__chart-section-body'>
              The total amount sent and total amount of voting weight changed
              per day.
            </div>
          </div>
          <LedgerChartMetrics
            data={data.send_volume.map((d) => [
              d[0],
              BigNumber(d[1]).shiftedBy(-30).toNumber()
            ])}
            label='Send Stats'
          />
          <LedgerChartMetrics
            data={data.change_volume.map((d) => [
              d[0],
              BigNumber(d[1]).shiftedBy(-30).toNumber()
            ])}
            label='Change Stats'
          />
        </div>
      </>
    )
  }
}

LedgerChartBlocks.propTypes = {
  data: PropTypes.object
}
