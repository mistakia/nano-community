import React from 'react'
import ImmutablePropTypes from 'react-immutable-proptypes'
import ReactEChartsCore from 'echarts-for-react/lib/core'
import * as echarts from 'echarts/core'
import { LineChart } from 'echarts/charts'

import { CanvasRenderer } from 'echarts/renderers'

echarts.use([LineChart, CanvasRenderer])

export default class RepresentativeConfirmationsBehind extends React.Component {
  render() {
    const { account } = this.props
    const history = account.get('telemetry_history')
    const data = []
    history.forEach((i) => {
      data.push([i.timestamp * 1000, i.cemented_behind])
    })

    const option = {
      color: ['red'],
      tooltip: {
        trigger: 'axis'
      },
      xAxis: {
        type: 'time'
      },
      yAxis: {
        type: 'value'
      },
      series: [
        {
          type: 'line',
          showSymbol: false,
          lineStyle: {
            width: 1
          },
          data
        }
      ]
    }

    return (
      <>
        <ReactEChartsCore echarts={echarts} option={option} />
      </>
    )
  }
}

RepresentativeConfirmationsBehind.propTypes = {
  account: ImmutablePropTypes.record
}
