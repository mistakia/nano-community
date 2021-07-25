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

import LedgerChartMetrics from '@components/ledger-chart-metrics'

echarts.use([
  TooltipComponent,
  LegendComponent,
  LineChart,
  CanvasRenderer,
  GridComponent
])

export default class LedgerChartBlocks extends React.Component {
  render() {
    const { data, isLoading } = this.props

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
          </div>
          <LedgerChartMetrics data={data.blocks} label='Total Block Stats' />
          <LedgerChartMetrics data={data.send_count} label='Send Block Stats' />
          <LedgerChartMetrics
            data={data.receive_count}
            label='Receive Block Stats'
          />
          <LedgerChartMetrics data={data.open_count} label='Open Block Stats' />
          <LedgerChartMetrics
            data={data.change_count}
            label='Change Block Stats'
          />
        </div>
      </>
    )
  }
}

LedgerChartBlocks.propTypes = {
  data: PropTypes.object,
  isLoading: PropTypes.bool
}
