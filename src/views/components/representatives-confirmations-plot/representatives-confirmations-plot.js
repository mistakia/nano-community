import React from 'react'
import PropTypes from 'prop-types'
import ImmutablePropTypes from 'react-immutable-proptypes'
import ReactEChartsCore from 'echarts-for-react/lib/core'
import BigNumber from 'bignumber.js'
import * as echarts from 'echarts/core'
import { ScatterChart } from 'echarts/charts'
import {
  TitleComponent,
  TooltipComponent,
  SingleAxisComponent
} from 'echarts/components'

import { CanvasRenderer } from 'echarts/renderers'

echarts.use([
  TitleComponent,
  TooltipComponent,
  SingleAxisComponent,
  ScatterChart,
  CanvasRenderer
])

export default class RepresentativesConfirmationsPlot extends React.Component {
  render() {
    const { accounts, totalWeight } = this.props

    const confirmationsData = []
    const blocksData = []
    accounts.forEach((a) => {
      if (a.telemetry.cemented_behind > 1000) return
      const weight = BigNumber(a.account_meta.weight)
        .dividedBy(totalWeight)
        .multipliedBy(100)
        .toFixed()
      const label = a.alias || a.account
      confirmationsData.push([a.telemetry.cemented_behind, weight, label])
      blocksData.push([a.telemetry.block_behind, weight, label])
    })

    const option = {
      color: ['#FF0000'],
      tooltip: {
        position: 'top'
      },
      title: [
        {
          text: 'Confirmations Behind',
          textStyle: {
            fontWeight: 'normal',
            fontFamily: 'IBM Plex Mono'
          }
        },
        {
          text: 'Blocks Behind',
          textStyle: {
            fontWeight: 'normal',
            fontFamily: 'IBM Plex Mono'
          },
          top: '50%'
        }
      ],
      singleAxis: [
        {
          type: 'value',
          height: '45%',
          top: 0
        },
        {
          type: 'value',
          top: '50%',
          bottom: 30
        }
      ],
      series: [
        {
          singleAxisIndex: 0,
          type: 'scatter',
          coordinateSystem: 'singleAxis',
          symbolSize: (dataItem) => Math.max(dataItem[1] * 1.5, 8),
          labelLayout: {
            y: 30,
            align: 'left',
            hideOverlap: true,
            width: 20,
            overflow: 'truncate'
          },
          labelLine: {
            show: true,
            length2: 2,
            lineStyle: {
              color: '#bbb'
            }
          },
          label: {
            show: true,
            formatter: (param) => param.data[2],
            minMargin: 10
          },
          tooltip: {
            formatter: (params) => params.data[2]
          },
          data: confirmationsData
        },
        {
          singleAxisIndex: 1,
          type: 'scatter',
          coordinateSystem: 'singleAxis',
          symbolSize: (dataItem) => Math.max(dataItem[1] * 1.5, 8),
          labelLayout: {
            y: '80%',
            align: 'left',
            hideOverlap: true,
            width: 20,
            overflow: 'truncate'
          },
          labelLine: {
            show: true,
            length2: 2,
            lineStyle: {
              color: '#bbb'
            }
          },
          label: {
            show: true,
            formatter: (param) => param.data[2],
            minMargin: 10
          },
          tooltip: {
            formatter: (params) => params.data[2]
          },
          data: blocksData
        }
      ]
    }

    return (
      <div className='representative__section graph'>
        <ReactEChartsCore echarts={echarts} option={option} />
      </div>
    )
  }
}

RepresentativesConfirmationsPlot.propTypes = {
  accounts: ImmutablePropTypes.list,
  totalWeight: PropTypes.number
}
