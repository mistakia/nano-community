import React, { useState, useEffect, useRef } from 'react'
import PropTypes from 'prop-types'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemText from '@mui/material/ListItemText'
import TextField from '@mui/material/TextField'
import Collapse from '@mui/material/Collapse'
import Badge from '@mui/material/Badge'
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight'
import ClickAwayListener from '@mui/material/ClickAwayListener'
import { fuzzySearch } from '@core/utils'

import LedgerChartBlocks from '@components/ledger-chart-blocks'
import LedgerChartAddresses from '@components/ledger-chart-addresses'
import LedgerChartVolume from '@components/ledger-chart-volume'
import LedgerChartAmounts from '@components/ledger-chart-amounts'
import LedgerChartUSDTransferred from '@components/ledger-chart-usd-transferred'
import LedgerChartDistribution from '@components/ledger-chart-distribution'
import LedgerChartAddressesWithBalance from '@components/ledger-chart-addresses-with-balance'
import Seo from '@components/seo'
import Menu from '@components/menu'
import { base_ranges, base_range_labels } from '@core/constants'

import './ledger.styl'

export default function LedgerPage({ load, data, isLoading }) {
  const previous_filter_text = useRef('')
  const [cached_open_categories, set_cached_open_categories] = useState({
    Addresses: true
  })
  const [selected_chart, set_selected_chart] = useState([
    'Addresses',
    'Address Counts'
  ])
  const [filter_text, set_filter_text] = useState('')
  const [open_categories, set_open_categories] = useState({ Addresses: true })
  const [filtered_categories, set_filtered_categories] = useState({})
  const [menu_open, set_menu_open] = useState(false)
  const filter_input_ref = useRef(null)

  const categories = {
    Addresses: {
      'Address Counts': (
        <LedgerChartAddresses data={data} isLoading={isLoading} />
      )
    },
    Blocks: {
      'Block Counts': <LedgerChartBlocks data={data} isLoading={isLoading} />
    },
    Transactions: {
      'Value Transferred': (
        <LedgerChartUSDTransferred data={data} isLoading={isLoading} />
      ),
      'Transfer Volume': (
        <LedgerChartVolume data={data} isLoading={isLoading} />
      ),
      'Transfer Amounts': (
        <LedgerChartAmounts data={data} isLoading={isLoading} />
      )
    },
    Distribution: {
      'Address Supply Distribution': (
        <LedgerChartDistribution data={data} isLoading={isLoading} />
      ),
      'Address Balances (Nano)': {
        ...base_ranges.reduce(
          (acc, range) => ({
            ...acc,
            [`Addresses with Balance ${base_range_labels[range]}`]: (
              <LedgerChartAddressesWithBalance
                data={data}
                isLoading={isLoading}
                range={range}
              />
            )
          }),
          {}
        )
      }
    }
  }

  useEffect(() => {
    load()
  }, [])

  useEffect(() => {
    if (filter_text.length > 0) {
      const result = {}

      for (const key of Object.keys(categories)) {
        const item = categories[key]

        if (React.isValidElement(item) && fuzzySearch(filter_text, key)) {
          result[key] = item
        } else {
          const charts = {}
          for (const chart_key of Object.keys(item)) {
            if (fuzzySearch(filter_text, chart_key)) {
              charts[chart_key] = item[chart_key]
            }
          }
          if (Object.keys(charts).length > 0) {
            result[key] = charts
          }
        }
      }

      set_filtered_categories(result)
    }

    if (filter_text.length && !previous_filter_text.current.length) {
      set_cached_open_categories({ ...open_categories })
    }

    if (filter_text.length === 0 && previous_filter_text.current.length) {
      set_open_categories(cached_open_categories)
    }

    previous_filter_text.current = filter_text
  }, [filter_text])

  useEffect(() => {
    if (filter_text.length > 0) {
      // Uncollapse all categories and their children when filtering
      const all_open_categories = Object.keys(categories).reduce((acc, key) => {
        const category = categories[key]
        if (typeof category === 'object') {
          const sub_keys = Object.keys(category)
          sub_keys.forEach((sub_key) => {
            acc[sub_key] = true
          })
        }
        acc[key] = true
        return acc
      }, {})
      set_open_categories(all_open_categories)
    }
  }, [filtered_categories, categories, filter_text])

  useEffect(() => {
    if (menu_open) {
      setTimeout(() => {
        filter_input_ref.current.focus()
      }, 300) // Delay to allow for transition effects
    } else {
      filter_input_ref.current.blur()
      set_filter_text('')
    }
  }, [menu_open])

  useEffect(() => {
    const updateMenuHeight = () => {
      const menuElement = document.querySelector('.ledger__menu-button')
      const toggleButtonElement = document.querySelector(
        '.ledger__toggle-button'
      )
      if (menuElement && toggleButtonElement) {
        if (menu_open) {
          menuElement.style.height = ''
        } else {
          menuElement.style.height = `${toggleButtonElement.scrollHeight}px`
        }
      }
    }

    window.addEventListener('resize', updateMenuHeight)
    updateMenuHeight()

    return () => {
      window.removeEventListener('resize', updateMenuHeight)
    }
  }, [menu_open, selected_chart])

  const handle_menu_toggle = () => {
    set_menu_open(!menu_open)
  }

  const handle_click_away = () => {
    set_menu_open(false)
    set_filter_text('')
  }

  const toggle_category = (category) => {
    set_open_categories((prev) => ({ ...prev, [category]: !prev[category] }))
  }

  const count_children = (children) => {
    return Object.values(children).reduce((acc, child) => {
      if (React.isValidElement(child)) {
        return acc + 1
      } else {
        return acc + count_children(child)
      }
    }, 0)
  }

  const render_category = (parent_category, children, depth, path = []) => {
    const is_open = open_categories[parent_category] || false
    const total_children_count = count_children(children)
    return (
      <>
        <ListItem
          onClick={() => toggle_category(parent_category)}
          className={`ledger__category ledger__category-depth-${depth}`}>
          <KeyboardArrowRightIcon
            style={{ transform: is_open ? 'rotate(90deg)' : 'none' }}
          />
          <ListItemText primary={parent_category} />
          <Badge badgeContent={total_children_count} color='primary' />
        </ListItem>
        <Collapse in={is_open} timeout='auto' unmountOnExit>
          <List component='div' disablePadding>
            {Object.entries(children).map(([key, value]) => {
              const current_path = [...path, parent_category]
              const is_selected =
                selected_chart.join(' > ') ===
                [...current_path, key].join(' > ')
              const item_class = is_selected ? 'ledger__chart--selected' : ''
              if (React.isValidElement(value)) {
                return (
                  <ListItem
                    key={key}
                    onClick={() => set_selected_chart([...current_path, key])}
                    className={`ledger__chart ledger__category-depth-${
                      depth + 1
                    } ${item_class}`}>
                    <ListItemText primary={key} />
                  </ListItem>
                )
              } else {
                return render_category(key, value, depth + 1, current_path)
              }
            })}
          </List>
        </Collapse>
      </>
    )
  }

  return (
    <>
      <Seo
        title='Nano Ledger Analysis'
        description='On-chain metrics and analytics of the Nano ledger'
        tags={[
          'nano',
          'ledger',
          'analytics',
          'chain',
          'on-chain',
          'analysis',
          'crypto',
          'blockchain',
          'data',
          'insights',
          'addresses',
          'active',
          'transactions'
        ]}
      />
      <ClickAwayListener onClickAway={handle_click_away}>
        <div
          className={`ledger__menu-button ${
            menu_open ? 'ledger__menu--open' : ''
          }`}
          tabIndex={0} // Make it focusable
        >
          <div onClick={handle_menu_toggle} className='ledger__toggle-button'>
            <KeyboardArrowRightIcon
              style={{ transform: menu_open ? 'rotate(90deg)' : 'none' }}
            />
            {selected_chart.join(' > ')}
          </div>
          <div className='ledger__filter-container'>
            <TextField
              variant='outlined'
              margin='normal'
              fullWidth
              id='filter'
              label='Filter Charts'
              name='filter'
              size='small'
              autoComplete='off'
              value={filter_text}
              onChange={(e) => set_filter_text(e.target.value)}
              inputRef={filter_input_ref}
            />
          </div>
          <div className='ledger__category-container'>
            <List>
              {Object.entries(
                filter_text.length > 0 ? filtered_categories : categories
              ).map(([parent_category, children]) =>
                render_category(parent_category, children, 0)
              )}
            </List>
          </div>
        </div>
      </ClickAwayListener>
      <div className='ledger__body'>
        <div className='ledger__metric'>
          {selected_chart.reduce((acc, key) => acc[key], categories)}
        </div>
      </div>
      <div className='ledger__footer'>
        <Menu />
      </div>
    </>
  )
}

LedgerPage.propTypes = {
  load: PropTypes.func,
  data: PropTypes.object,
  isLoading: PropTypes.bool
}
