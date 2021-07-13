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

export default class RepresentativesClusterCharts extends React.Component {
  render() {
    const { accounts, totalWeight } = this.props

    const confirmationsData = []
    const blocksData = []
    const peersData = []
    const bandwidthData = []
    const uncheckedData = []
    accounts.forEach((a) => {
      if (a.telemetry.cemented_behind > 1000) return
      const weight = BigNumber(a.account_meta.weight)
        .dividedBy(totalWeight)
        .multipliedBy(100)
        .toFixed()
      const label = a.alias || a.account
      confirmationsData.push([a.telemetry.cemented_behind, weight, label])
      blocksData.push([a.telemetry.block_behind, weight, label])
      peersData.push([a.telemetry.peer_count, weight, label])
      uncheckedData.push([a.telemetry.unchecked_count, weight, label])

      // exclude 0 (unlimited)
      if (a.telemetry.bandwidth_cap)
        bandwidthData.push([
          a.telemetry.bandwidth_cap / (1024 * 1024),
          weight,
          label
        ])
    })

    const seriesCommon = {
      type: 'scatter',
      coordinateSystem: 'singleAxis',
      symbolSize: (dataItem) => Math.min(Math.max(dataItem[1] * 6, 6), 35),
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
        className: 'echarts-tooltip',
        formatter: (params) => params.data[2]
      }
    }

    const titleCommon = {
      left: 'center',
      textStyle: {
        fontWeight: 'normal',
        fontFamily: 'IBM Plex Mono'
      }
    }

    const option = {
      tooltip: {
        className: 'echarts-tooltip',
        position: 'top'
      },
      title: [
        {
          text: 'Confirmations Behind',
          top: 20,
          ...titleCommon
        },
        {
          text: 'Blocks Behind',
          top: 140,
          ...titleCommon
        },
        {
          text: 'Unchecked Count',
          top: 260,
          ...titleCommon
        },
        {
          text: 'Bandwidth Limit',
          top: 380,
          ...titleCommon
        },
        {
          text: 'Peer Count',
          top: 500,
          ...titleCommon
        }
      ],
      singleAxis: [
        {
          type: 'value',
          height: '100px',
          top: 0
        },
        {
          type: 'value',
          top: '120px',
          height: '100px'
        },
        {
          scale: true,
          type: 'value',
          top: '240px',
          height: '100px'
        },
        {
          type: 'value',
          top: '360px',
          height: '100px',
          axisLabel: {
            formatter: (value) => `${value} mb/s`
          }
        },
        {
          scale: true,
          type: 'value',
          top: '480px',
          height: '100px'
        }
      ],
      series: [
        {
          singleAxisIndex: 0,
          labelLayout: {
            y: 80,
            align: 'left',
            hideOverlap: true,
            width: 20,
            overflow: 'truncate'
          },
          data: confirmationsData,
          ...seriesCommon
        },
        {
          singleAxisIndex: 1,
          labelLayout: {
            y: 200,
            align: 'left',
            hideOverlap: true,
            width: 20,
            overflow: 'truncate'
          },
          data: blocksData,
          ...seriesCommon
        },
        {
          singleAxisIndex: 2,
          labelLayout: {
            y: 320,
            align: 'left',
            hideOverlap: true,
            width: 20,
            overflow: 'truncate'
          },
          data: uncheckedData,
          ...seriesCommon
        },
        {
          singleAxisIndex: 3,
          labelLayout: {
            y: 440,
            align: 'left',
            hideOverlap: true,
            width: 20,
            overflow: 'truncate'
          },
          data: bandwidthData,
          ...seriesCommon
        },
        {
          singleAxisIndex: 4,
          labelLayout: {
            y: 560,
            align: 'left',
            hideOverlap: true,
            width: 20,
            overflow: 'truncate'
          },
          data: peersData,
          ...seriesCommon
        }
      ]
    }

    return (
      <>
        <ReactEChartsCore
          echarts={echarts}
          option={option}
          style={{ height: '620px' }}
        />
      </>
    )
  }
}

RepresentativesClusterCharts.propTypes = {
  accounts: ImmutablePropTypes.list,
  totalWeight: PropTypes.number
}
