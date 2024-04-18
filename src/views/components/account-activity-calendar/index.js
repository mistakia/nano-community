import { connect } from 'react-redux'

import { accountsActions } from '@core/accounts/actions'

import AccountActivityCalendar from './account-activity-calendar'

const map_dispatch_to_props = {
  get_account_blocks_per_day: accountsActions.get_account_blocks_per_day
}

export default connect(null, map_dispatch_to_props)(AccountActivityCalendar)
