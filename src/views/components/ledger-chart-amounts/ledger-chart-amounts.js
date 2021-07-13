import React from 'react'
import PropTypes from 'prop-types'
import ReactEChartsCore from 'echarts-for-react/lib/core'
import * as echarts from 'echarts/core'
import { LineChart, BarChart, ThemeRiverChart } from 'echarts/charts'
import {
  TooltipComponent,
  LegendComponent,
  GridComponent
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'

echarts.use([
  TooltipComponent,
  ThemeRiverChart,
  LegendComponent,
  LineChart,
  BarChart,
  CanvasRenderer,
  GridComponent
])

export default class LedgerChartBlocks extends React.Component {
  render() {
    const { data } = this.props

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

    const option = {
      grid: {
        containLabel: true,
        bottom: 120
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
      series: Object.entries(ranges).map((item) => ({
        type: 'line',
        name: item[1],
        showSymbol: false,
        lineStyle: {
          width: 1
        },
        data: data[item[0]]
      }))
    }

    return (
      <>
        <ReactEChartsCore
          echarts={echarts}
          option={option}
          style={{ width: '100%', height: '600px' }}
        />
        <div className='ledger__chart-sections'>
          <div className='ledger__chart-section'>
            <div className='ledger__chart-section-heading'>
              <span>Description</span>
            </div>
            <div className='ledger__chart-section-body description'>
              The number of confirmed send-type blocks per day where the amount
              in the block is in a given range (in Nano)
            </div>
          </div>
        </div>
      </>
    )
  }
}

LedgerChartBlocks.propTypes = {
  data: PropTypes.object
}
