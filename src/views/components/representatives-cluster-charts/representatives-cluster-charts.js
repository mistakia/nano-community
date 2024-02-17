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
import { useTranslation } from 'react-i18next'

import { CanvasRenderer } from 'echarts/renderers'

echarts.use([
  TitleComponent,
  TooltipComponent,
  SingleAxisComponent,
  ScatterChart,
  CanvasRenderer
])

export default function RepresentativesClusterCharts({
  accounts,
  totalWeight
}) {
  const { t } = useTranslation()
  const confirmations_data = []
  const blocks_data = []
  const peers_data = []
  const bandwidth_data = []
  const unchecked_data = []
  accounts.forEach((a) => {
    if (a.telemetry.cemented_behind > 1000) return
    const weight = BigNumber(a.account_meta.weight)
      .dividedBy(totalWeight)
      .multipliedBy(100)
      .toFixed()
    const label = a.alias || a.account
    confirmations_data.push([a.telemetry.cemented_behind, weight, label])
    blocks_data.push([a.telemetry.block_behind, weight, label])
    peers_data.push([a.telemetry.peer_count, weight, label])
    unchecked_data.push([a.telemetry.unchecked_count, weight, label])

    // exclude 0 (unlimited)
    if (a.telemetry.bandwidth_cap)
      bandwidth_data.push([
        a.telemetry.bandwidth_cap / (1024 * 1024),
        weight,
        label
      ])
  })

  const series_common = {
    type: 'scatter',
    coordinateSystem: 'singleAxis',
    symbolSize: (data_item) => Math.min(Math.max(data_item[1] * 6, 6), 35),
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

  const title_common = {
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
        text: t('representatives_cluster.conf_diff', 'Confirmations Behind'),
        top: 20,
        ...title_common
      },
      {
        text: t('representatives_cluster.blocks_diff', 'Blocks Behind'),
        top: 140,
        ...title_common
      },
      {
        text: t('representatives_cluster.unchecked', 'Unchecked Count'),
        top: 260,
        ...title_common
      },
      {
        text: t('common.bandwidth_limit', 'Bandwidth Limit'),
        top: 380,
        ...title_common
      },
      {
        text: t('common.peers', 'Peers'),
        top: 500,
        ...title_common
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
        data: confirmations_data,
        ...series_common
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
        data: blocks_data,
        ...series_common
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
        data: unchecked_data,
        ...series_common
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
        data: bandwidth_data,
        ...series_common
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
        data: peers_data,
        ...series_common
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

RepresentativesClusterCharts.propTypes = {
  accounts: ImmutablePropTypes.list,
  totalWeight: PropTypes.number
}
