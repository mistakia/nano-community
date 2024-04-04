import React from 'react'
import PropTypes from 'prop-types'
import ReactEChartsCore from 'echarts-for-react/lib/core'
import BigNumber from 'bignumber.js'
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

export default function LedgerUSDTransferred({ data, isLoading }) {
  const { t } = useTranslation()
  const span_style =
    'float:right;margin-left:20px;font-size:14px;color:#666;font-weight:900'

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
            } <span style="${span_style}">$${BigNumber(s.data[1]).toFormat(
              2
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
      min: 1,
      name: 'Nano',
      axisLabel: {
        formatter: (value) => {
          const format_value = (number, divisor, suffix) => {
            const result = number / divisor
            return `$${result.toFixed(result % 1 !== 0 ? 1 : 0)}${suffix}`
          }
          if (value >= 1000000000) {
            return format_value(value, 1000000000, 'B')
          } else if (value >= 1000000) {
            return format_value(value, 1000000, 'M')
          } else if (value >= 1000) {
            return format_value(value, 1000, 'K')
          } else {
            return `$${value}`
          }
        }
      }
    },
    series: [
      {
        type: 'line',
        name: t('ledger.usd_transferred.usd_transferred', 'USD Transferred'),
        showSymbol: false,
        lineStyle: {
          width: 1
        },
        data: data.total_usd_send_value
      }
    ]
  }

  const handle_download_csv = () => {
    const download_data = data.total_usd_send_value.map((d) => ({
      date: d[0],
      value: d[1]
    }))

    download_csv({
      headers: ['Date', 'USD Transferred'],
      data: download_data,
      file_name: 'nano-community-ledger-daily-usd-transferred'
    })
  }

  const handle_download_json = () => {
    const download_data = data.total_usd_send_value.map((d) => ({
      date: d[0],
      value: d[1]
    }))

    download_json({
      data: {
        title: 'Nano Community Ledger Daily USD Transferred',
        timestamp: new Date().toISOString(),
        data: download_data
      },
      file_name: 'nano-community-ledger-daily-usd-transferred'
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
            <p>
              {t(
                'ledger.usd_transferred.desc_1',
                'The total amount of value transferred (in USD) per day.'
              )}
            </p>
            <p>
              {t(
                'ledger.usd_transferred.desc_2',
                'Based on the daily closing price of Nano/USD and the total amount of Nano transferred that day.'
              )}
            </p>
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
          data={data.total_usd_send_value.map((d) => [d[0], d[1]])}
          label={t(
            'ledger.usd_transferred.usd_transferred_stats',
            'USD Transferred Stats'
          )}
          show_total
        />
      </div>
    </>
  )
}

LedgerUSDTransferred.propTypes = {
  data: PropTypes.object,
  isLoading: PropTypes.bool
}
