import React, { useMemo } from 'react'
import PropTypes from 'prop-types'
import BigNumber from 'bignumber.js'
import ReactEChartsCore from 'echarts-for-react/lib/core'
import * as echarts from 'echarts/core'
import { LineChart } from 'echarts/charts'
import {
  TooltipComponent,
  LegendComponent,
  GridComponent
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import Button from '@mui/material/Button'
import { useTranslation } from 'react-i18next'

import LedgerChartMetrics from '@components/ledger-chart-metrics'
import { download_csv, download_json } from '@core/utils'

echarts.use([
  TooltipComponent,
  LegendComponent,
  LineChart,
  CanvasRenderer,
  GridComponent
])

export default function LedgerChartVolume({ data, isLoading }) {
  const { t } = useTranslation()
  const span_style =
    'float:right;margin-left:20px;font-size:14px;color:#666;font-weight:900'

  const convert_volumes_to_big_number = (volumes) =>
    volumes.map((volume) => [
      volume[0],
      new BigNumber(volume[1]).shiftedBy(-30).toNumber()
    ])

  const send_volume_big_number = useMemo(() => {
    return convert_volumes_to_big_number(data.send_volume)
  }, [data.send_volume])

  const change_volume_big_number = useMemo(() => {
    return convert_volumes_to_big_number(data.change_volume)
  }, [data.change_volume])

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
      trigger: 'axis',
      formatter: (series) => {
        const values = series.map(
          (s) =>
            `${s.marker} ${
              s.seriesName
            } <span style="${span_style}">${BigNumber(s.data[1]).toFormat(
              0
            )}</span>`
        )

        values.unshift(series[0].axisValueLabel)

        return values.join('<br/>')
      }
    },
    xAxis: {
      type: 'time'
    },
    yAxis: {
      type: 'log',
      name: 'Nano',
      axisLabel: {
        formatter: (value) => `${BigNumber(value).toFormat(0)}`
      },
      min: 1,
      max: 80000000
    },
    series: [
      {
        type: 'line',
        name: t('block_type.send', 'Send'),
        showSymbol: false,
        lineStyle: {
          width: 1
        },
        data: send_volume_big_number
      },
      {
        type: 'line',
        name: t('block_type.change', 'Change'),
        showSymbol: false,
        lineStyle: {
          width: 1
        },
        data: change_volume_big_number
      }
    ]
  }

  const handle_download_csv = () => {
    const download_data = []
    send_volume_big_number.forEach((item, index) => {
      download_data.push({
        date: item[0],
        send_volume: item[1].toString(),
        change_volume: change_volume_big_number[index][1].toString()
      })
    })

    download_csv({
      headers: ['Date', 'Send Volume', 'Change Volume'],
      data: download_data,
      file_name: 'nano-community-ledger-daily-volume-stats'
    })
  }

  const handle_download_json = () => {
    const download_data = []
    send_volume_big_number.forEach((item, index) => {
      download_data.push({
        date: item[0],
        send_volume: item[1].toString(),
        change_volume: change_volume_big_number[index][1].toString()
      })
    })

    download_json({
      data: {
        title: 'Nano Community Ledger Daily Volume Stats',
        timestamp: new Date().toISOString(),
        data: download_data
      },
      file_name: 'nano-community-ledger-daily-volume-stats'
    })
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
              'ledger.volume.description',
              'The total amount sent (in Nano) and total amount of voting weight changed per day.'
            )}
          </div>
          {!isLoading && (
            <div className='ledger__chart-section-body download'>
              <Button size='small' onClick={handle_download_csv}>
                Download CSV
              </Button>
              <Button size='small' onClick={handle_download_json}>
                Download JSON
              </Button>
            </div>
          )}
        </div>
        <LedgerChartMetrics
          data={send_volume_big_number}
          label={t('ledger.volume.send_stats', 'Send Stats')}
          show_total
        />
        <LedgerChartMetrics
          data={change_volume_big_number}
          label={t('ledger.volume.change_stats', 'Change Stats')}
          show_total
        />
      </div>
    </>
  )
}

LedgerChartVolume.propTypes = {
  data: PropTypes.object,
  isLoading: PropTypes.bool
}
