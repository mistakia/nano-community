import React from 'react'
import { Map } from 'immutable'
import Table from 'react-table/index.js'
import * as table_constants from 'react-table/src/constants.mjs'

import Seo from '@components/seo'

export default function AccountsPage() {
  const accounts = []

  const on_view_change = () => {
    console.log('on_view_change')
  }

  // header_label - string, required
  // column_groups - array, optional
  // load - optional
  // component - optional
  // header_className - optional
  // getValue - optional
  // player_value_path - optional
  // getPercentileKey - optional
  // percentile_key - optional
  // percentile_field - optional

  // fixed - optional
  const all_columns = {
    account_address: {
      column_id: 'account_address',
      key_path: [],
      column_name: 'account_address',
      accessorKey: 'account_address',
      header_label: 'Address',
      size: 100,
      data_type: table_constants.TABLE_DATA_TYPES.TEXT,
      sticky: true
    },
    account_balance: {
      column_id: 'account_balance',
      key_path: [],
      column_name: 'account_balance',
      accessorKey: 'account_balance',
      header_label: 'Balance',
      size: 50,
      data_type: table_constants.TABLE_DATA_TYPES.NUMBER
    }
  }

  const accounts_table_view = {
    view_id: 'ACCOUNTS',
    view_name: 'Accounts',
    view_description: 'Accounts',
    view_filters: [],
    view_search_column_id: 'account_address',
    table_state: {
      sort: [
        {
          id: 'account_balance',
          desc: true
        }
      ],
      prefix_columns: ['account_address'],
      columns: ['account_balance']
    }
  }

  const select_view = () => {
    console.log('select_view')
  }

  const fetch_more = () => {
    console.log('fetch_more')
  }

  const delete_view = () => {
    console.log('delete_view')
  }

  const views = new Map({
    ACCOUNTS: accounts_table_view
  })

  return (
    <>
      <Seo
        title='Nano Accounts'
        description='Explore the Nano blockchain accounts'
        tags={['nano', 'accounts', 'explorer', 'blockchain']}
      />
      <Table
        style={{ fontFamily: "'IBM Plex Mono', monospace" }}
        data={accounts}
        on_view_change={on_view_change}
        table_state={accounts_table_view.table_state}
        all_columns={all_columns}
        selected_view={accounts_table_view}
        select_view={select_view}
        fetch_more={fetch_more}
        total_rows_fetched={accounts.size}
        total_row_count={accounts.size} // TODO get from server
        is_fetching={accounts_table_view.is_fetching}
        views={views}
        delete_view={delete_view}
        disable_rank_aggregation
        percentiles={undefined}
      />
    </>
  )
}
