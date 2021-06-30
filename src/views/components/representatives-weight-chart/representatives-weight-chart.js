import React from 'react'
import PropTypes from 'prop-types'
import ImmutablePropTypes from 'react-immutable-proptypes'
import ReactEChartsCore from 'echarts-for-react/lib/core'
import BigNumber from 'bignumber.js'
import * as echarts from 'echarts/core'
import { PieChart } from 'echarts/charts'
import { TitleComponent, TooltipComponent } from 'echarts/components'

import { CanvasRenderer } from 'echarts/renderers'

echarts.use([TitleComponent, TooltipComponent, PieChart, CanvasRenderer])

const truncate = (str, n) =>
  str.length > n ? `${str.substr(0, n - 1)}...` : str

export default class RepresentativesWeightChart extends React.Component {
  render() {
    const { accounts, totalWeight } = this.props

    const weightData = []
    accounts.forEach((a) => {
      const bn = BigNumber(a.account_meta.weight)
      const weight = bn.shiftedBy(-30).toFixed(0)
      const pct = bn.dividedBy(totalWeight).multipliedBy(100).toFixed(1)

      const label = a.alias || a.account
      weightData.push([weight, label, pct])
    })

    const option = {
      tooltip: {
        trigger: 'item',
        formatter: (p) =>
          `${p.data[1]}<br/>${BigNumber(p.data[0]).toFormat(0)} (${
            p.data[2]
          } %)`
      },
      title: {
        text: 'Weight Distribution by Rep',
        textStyle: {
          fontWeight: 'normal',
          fontFamily: 'IBM Plex Mono'
        }
      },
      series: [
        {
          type: 'pie',
          radius: '50%',
          center: ['60%', '50%'],
          avoidLabelOverlap: false,
          data: weightData.sort((a, b) => b[0] - a[0]),
          label: {
            bleedMargin: 30,
            formatter: (p) => `${truncate(p.data[1], 20)}: ${p.data[2]} %`
          },
          labelLayout: {
            height: 50,
            hideOverlap: true
          }
        }
      ]
    }

    return (
      <div className='representative__section graph'>
        <ReactEChartsCore
          echarts={echarts}
          option={option}
          style={{ height: '620px' }}
        />
      </div>
    )
  }
}

RepresentativesWeightChart.propTypes = {
  accounts: ImmutablePropTypes.list,
  totalWeight: PropTypes.number
}
