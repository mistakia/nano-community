import React, { useEffect, useMemo } from 'react'
import PropTypes from 'prop-types'
import ImmutablePropTypes from 'react-immutable-proptypes'
import { List } from 'immutable'
import ReactEChartsCore from 'echarts-for-react/lib/core'
import * as echarts from 'echarts/core'
import { HeatmapChart } from 'echarts/charts'
import {
  TooltipComponent,
  CalendarComponent,
  VisualMapComponent
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'

echarts.use([
  HeatmapChart,
  TooltipComponent,
  CalendarComponent,
  CanvasRenderer,
  VisualMapComponent
])

export default function AccountActivityCalendar({
  account,
  get_account_blocks_per_day
}) {
  const account_address = account.get('account')

  useEffect(() => {
    if (account_address) {
      get_account_blocks_per_day(account_address)
    }
  }, [account_address, get_account_blocks_per_day])

  const blocks_per_day = account.get('blocks_per_day', new List())
  const is_loading = account.get('account_is_loading_blocks_per_day')

  const heatmap_data_by_year = useMemo(() => {
    const data_by_year = {}
    blocks_per_day
      .filter((item) => item.day != null)
      .forEach((item) => {
        const year = item.day.split('-')[0]
        if (!data_by_year[year]) {
          data_by_year[year] = []
        }
        data_by_year[year].push([item.day, Number(item.block_count)])
      })
    return data_by_year
  }, [blocks_per_day])

  const max_block_count = useMemo(() => {
    let max = 0
    Object.values(heatmap_data_by_year).forEach((yearData) => {
      yearData.forEach((item) => {
        if (item[1] > max) max = item[1]
      })
    })
    return max
  }, [heatmap_data_by_year])

  const options_by_year = useMemo(() => {
    const years_descending = Object.keys(heatmap_data_by_year).sort(
      (a, b) => b - a
    )
    return years_descending.map((year, index) => {
      const data = heatmap_data_by_year[year]
      return {
        tooltip: {
          position: 'top',
          formatter: function (params) {
            const formatted_date = new Date(params.value[0]).toLocaleDateString(
              'en-US',
              {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              }
            )
            const color_span = `<span style="display:inline-block;margin-left:4px;border-radius:10px;width:10px;height:10px;background-color:${params.color};"></span>`
            return `Date: ${formatted_date}<br/>Blocks: ${params.value[1]}${color_span}`
          }
        },
        visualMap: {
          show: index === 0,
          min: 0,
          max: max_block_count,
          calculable: true,
          orient: 'horizontal',
          left: 'center',
          top: 0
        },
        calendar: {
          range: year,
          cellSize: ['auto', 13],
          top: index === 0 ? '80' : '20', // Adjusted top margin for the first chart to make room for the visualMap
          bottom: '20'
        },
        series: [
          {
            type: 'heatmap',
            coordinateSystem: 'calendar',
            data
          }
        ]
      }
    })
  }, [heatmap_data_by_year, max_block_count])

  return (
    <>
      {options_by_year.map((option, index) => (
        <ReactEChartsCore
          key={index}
          echarts={echarts}
          option={option}
          style={{
            height: index === 0 ? '200px' : '140px',
            width: '100%',
            marginTop: '10px',
            marginBottom: '10px'
          }}
          showLoading={is_loading}
          loadingOption={{
            maskColor: 'rgba(255, 255, 255, 0)',
            text: '',
            spinnerRadius: 24,
            lineWidth: 2
          }}
        />
      ))}
    </>
  )
}

AccountActivityCalendar.propTypes = {
  account: ImmutablePropTypes.map.isRequired,
  get_account_blocks_per_day: PropTypes.func.isRequired
}
