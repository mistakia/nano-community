import React, { useEffect } from 'react'
import Table from 'react-table/index.js'

import Seo from '@components/seo'
import Menu from '@components/menu'

export default function TelemetryPage({
  data,
  all_columns,
  table_state,
  saved_table_state,
  is_loading,
  is_fetching,
  total_row_count,
  total_rows_fetched,
  selected_view,
  views,
  data_view_changed,
  set_selected_data_view,
  reset_data_view_cache,
  load_data_view
}) {
  useEffect(() => {
    load_data_view()
  }, [])

  const on_view_change = (data_view, view_change_params) => {
    data_view_changed(data_view, view_change_params)
  }

  return (
    <>
      <Seo
        title='Nano Telemetry'
        description='Nano network telemetry explorer'
        tags={[
          'nano',
          'telemetry',
          'network',
          'representatives',
          'network',
          'crypto',
          'currency',
          'cryptocurrency',
          'digital',
          'money',
          'feeless',
          'energy',
          'green',
          'sustainable'
        ]}
      />
      <Table
        data={data}
        all_columns={all_columns}
        table_state={table_state}
        saved_table_state={saved_table_state}
        on_view_change={on_view_change}
        is_loading={is_loading}
        is_fetching={is_fetching}
        total_row_count={total_row_count}
        total_rows_fetched={total_rows_fetched}
        selected_view={selected_view}
        views={views}
        select_view={set_selected_data_view}
        disable_rank_aggregation
      />
      <div className='representatives__footer'>
        <Menu />
      </div>
    </>
  )
}
