import React from 'react'
import PropTypes from 'prop-types'
import BigNumber from 'bignumber.js'
import ReactEChartsCore from 'echarts-for-react/lib/core'
import * as echarts from 'echarts/core'
import { ScatterChart, LineChart } from 'echarts/charts'
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
  LineChart,
  CanvasRenderer
])

export default class RepresentativesQuorumCharts extends React.Component {
  componentDidMount() {
    this.props.load()
  }

  render() {
    const { data } = this.props
    console.log(data)

    const commonOptions = {
      tooltip: {
        trigger: 'axis',
        formatter: (p) =>
          p
            .map(
              (s) =>
                `${s.marker} ${BigNumber(s.data[1]).toFormat(0)}M - ${
                  new URL(s.data[2]).hostname
                }`
            )
            .join('<br/>')
      },
      xAxis: {
        type: 'time'
      },
      yAxis: {
        type: 'value',
        scale: true,
        axisLabel: {
          formatter: (value) => `${value}M`
        }
      }
    }

    const commonTitle = {
      top: 10,
      left: 'center',
      textStyle: {
        fontWeight: 'normal',
        fontFamily: 'IBM Plex Mono'
      }
    }

    const onlineOption = {
      title: {
        text: 'Online Weight',
        ...commonTitle
      },
      series: data.map((d) => ({
        type: 'line',
        showSymbol: false,
        data: d.onlineStake
      })),
      ...commonOptions
    }

    const trendedOption = {
      title: {
        text: 'Trended Weight',
        ...commonTitle
      },
      series: data.map((d) => ({
        type: 'line',
        showSymbol: false,
        data: d.trendedStake
      })),
      ...commonOptions
    }

    const peersOption = {
      title: {
        text: 'Peers Weight',
        ...commonTitle
      },
      series: data.map((d) => ({
        type: 'line',
        showSymbol: false,
        data: d.peersStake
      })),
      ...commonOptions
    }

    const quorumOption = {
      title: {
        text: 'Quorum Delta',
        ...commonTitle
      },
      series: data.map((d) => ({
        type: 'line',
        showSymbol: false,
        data: d.quorumDelta
      })),
      ...commonOptions
    }

    return (
      <>
        <ReactEChartsCore
          echarts={echarts}
          option={onlineOption}
          style={{ width: '100%', height: '200px' }}
        />
        <ReactEChartsCore
          echarts={echarts}
          option={trendedOption}
          style={{ width: '100%', height: '200px' }}
        />
        <ReactEChartsCore
          echarts={echarts}
          option={peersOption}
          style={{ width: '100%', height: '200px' }}
        />
        <ReactEChartsCore
          echarts={echarts}
          option={quorumOption}
          style={{ width: '100%', height: '200px' }}
        />
      </>
    )
  }
}

RepresentativesQuorumCharts.propTypes = {
  data: PropTypes.array,
  load: PropTypes.func
}
