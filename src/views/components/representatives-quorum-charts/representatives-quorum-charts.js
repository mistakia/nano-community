import React, { useEffect } from 'react'
import PropTypes from 'prop-types'
import BigNumber from 'bignumber.js'
import ReactEChartsCore from 'echarts-for-react/lib/core'
import * as echarts from 'echarts/core'
import { LineChart } from 'echarts/charts'
import { TitleComponent, TooltipComponent } from 'echarts/components'
import { useTranslation } from 'react-i18next'

import { CanvasRenderer } from 'echarts/renderers'

echarts.use([TitleComponent, TooltipComponent, LineChart, CanvasRenderer])

export default function RepresentativesQuorumCharts({ data, peerData, load }) {
  const { t } = useTranslation()

  useEffect(() => {
    load()
  }, [load])

  const commonOptions = {
    tooltip: {
      className: 'echarts-tooltip',
      trigger: 'axis',
      formatter: (p) => {
        const values = p.map(
          (s) =>
            `${s.marker} ${s.data[2]} - ${BigNumber(s.data[1]).toFormat(0)}M`
        )

        values.unshift(p[0].axisValueLabel)

        return values.join('<br/>')
      }
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
    color: ['#5470c6', 'red', '#5470c6'],
    title: {
      text: t('representatives_quorum_chart.title', 'Online Weight'),
      ...commonTitle
    },
    series: [
      {
        type: 'line',
        showSymbol: false,
        data: data.online_stake_total.max,
        areaStyle: {},
        lineStyle: {
          opacity: 0
        }
      },
      {
        type: 'line',
        showSymbol: false,
        data: data.online_stake_total.median,
        lineStyle: {
          color: 'red'
        }
      },
      {
        type: 'line',
        showSymbol: false,
        data: data.online_stake_total.min,
        areaStyle: {
          color: 'white',
          opacity: 1
        },
        lineStyle: {
          opacity: 0
        }
      }
    ],
    ...commonOptions
  }

  const trendedOption = {
    color: ['#5470c6', 'red', '#5470c6'],
    title: {
      text: t('representatives_quorum_chart.trended_weight', 'Trended Weight'),
      ...commonTitle
    },
    series: [
      {
        type: 'line',
        showSymbol: false,
        data: data.trended_stake_total.max,
        areaStyle: {},
        lineStyle: {
          opacity: 0
        }
      },
      {
        type: 'line',
        showSymbol: false,
        data: data.trended_stake_total.median,
        lineStyle: {
          color: 'red'
        }
      },
      {
        type: 'line',
        showSymbol: false,
        data: data.trended_stake_total.min,
        areaStyle: {
          color: 'white',
          opacity: 1
        },
        lineStyle: {
          opacity: 0
        }
      }
    ],
    ...commonOptions
  }

  const peersOption = {
    ...commonOptions,
    title: {
      text: t('representatives_quorum_chart.peers_weight', 'Peers Weight'),
      ...commonTitle
    },
    series: peerData.map((data) => ({
      type: 'line',
      showSymbol: false,
      data
    })),
    tooltip: {
      className: 'echarts-tooltip',
      trigger: 'axis',
      formatter: (p) => {
        const values = p.map(
          (s) =>
            `${s.marker} ${BigNumber(s.data[1]).toFormat(0)}M - ${
              new URL(s.data[2]).hostname
            }`
        )
        values.unshift(p[0].axisValueLabel)
        return values.join('<br/>')
      }
    }
  }

  const quorumOption = {
    color: ['#5470c6', 'red', '#5470c6'],
    title: {
      text: t('common.quorum_delta', 'Quorum Delta'),
      ...commonTitle
    },
    series: [
      {
        type: 'line',
        showSymbol: false,
        data: data.quorum_delta.max,
        areaStyle: {},
        lineStyle: {
          opacity: 0
        }
      },
      {
        type: 'line',
        showSymbol: false,
        data: data.quorum_delta.median,
        lineStyle: {
          color: 'red'
        }
      },
      {
        type: 'line',
        showSymbol: false,
        data: data.quorum_delta.min,
        areaStyle: {
          color: 'white',
          opacity: 1
        },
        lineStyle: {
          opacity: 0
        }
      }
    ],
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

RepresentativesQuorumCharts.propTypes = {
  data: PropTypes.object,
  peerData: PropTypes.array,
  load: PropTypes.func
}
