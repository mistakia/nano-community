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
import { useTranslation } from 'react-i18next'

import LedgerChartMetrics from '@components/ledger-chart-metrics'

echarts.use([
  TooltipComponent,
  LegendComponent,
  LineChart,
  CanvasRenderer,
  GridComponent
])

export default function LedgerChartBlocks({ data, isLoading }) {
  const { t } = useTranslation()
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
      name: t('common.blocks', 'Blocks'),
      min: 1
    },
    series: [
      {
        type: 'line',
        name: t('common.Total', 'Total'),
        showSymbol: false,
        lineStyle: {
          width: 1
        },
        data: data.blocks
      },
      {
        type: 'line',
        name: t('block_type.send', 'Send'),
        showSymbol: false,
        lineStyle: {
          width: 1
        },
        data: data.send_count
      },
      {
        type: 'line',
        name: t('block_type.change', 'Change'),
        showSymbol: false,
        lineStyle: {
          width: 1
        },
        data: data.change_count
      },
      {
        type: 'line',
        name: t('block_type.receive', 'Receive'),
        showSymbol: false,
        lineStyle: {
          width: 1
        },
        data: data.open_count
      },
      {
        type: 'line',
        name: t('block_type.open', 'Open'),
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
            <span>{t('ledger.description', 'Description')}</span>
          </div>
          <div className='ledger__chart-section-body description'>
            {t(
              'ledger.blocks.description',
              'The number of blocks confirmed per day.'
            )}
          </div>
        </div>
        <LedgerChartMetrics
          data={data.blocks}
          label={t('ledger.blocks.total', 'Total Block Stats')}
          show_total
        />
        <LedgerChartMetrics
          data={data.send_count}
          label={t('ledger.blocks.send', 'Send Block Stats')}
          show_total
        />
        <LedgerChartMetrics
          data={data.receive_count}
          label={t('ledger.blocks.receive', 'Receive Block Stats')}
          show_total
        />
        <LedgerChartMetrics
          data={data.open_count}
          label={t('ledger.blocks.open', 'Open Block Stats')}
          show_total
        />
        <LedgerChartMetrics
          data={data.change_count}
          label={t('ledger.blocks.change', 'Change Block Stats')}
          show_total
        />
      </div>
    </>
  )
}

LedgerChartBlocks.propTypes = {
  data: PropTypes.object,
  isLoading: PropTypes.bool
}
