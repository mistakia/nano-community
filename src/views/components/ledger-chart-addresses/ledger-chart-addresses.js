import React from 'react'
import PropTypes from 'prop-types'
import ReactEChartsCore from 'echarts-for-react/lib/core'
import * as echarts from 'echarts/core'
import { LineChart } from 'echarts/charts'
import { TooltipComponent, LegendComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'

import LedgerChartMetrics from '@components/ledger-chart-metrics'

echarts.use([TooltipComponent, LegendComponent, LineChart, CanvasRenderer])

export default class LedgerChartAddresses extends React.Component {
  render() {
    const { data } = this.props

    const option = {
      legend: {
        show: true,
        bottom: 0
      },
      tooltip: {
        trigger: 'axis'
      },
      xAxis: {
        type: 'time'
      },
      yAxis: {
        type: 'log',
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
          name: 'New',
          lineStyle: {
            width: 1
          },
          data: data.open_count
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
              The total number of unique and new addresses per day.
            </div>
          </div>
          <LedgerChartMetrics
            data={data.active_addresses}
            label='Active Address Stats'
          />
          <LedgerChartMetrics
            data={data.open_count}
            label='New Address Stats'
          />
        </div>
      </>
    )
  }
}

LedgerChartAddresses.propTypes = {
  data: PropTypes.object
}
