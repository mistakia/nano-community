import { connect } from 'react-redux'
import { createSelector } from 'reselect'

import { i18nActions } from '@core/i18n'

import ChangeLocale from './change-locale'

const mapStateToProps = createSelector(
  (state) => state.getIn(['i18n', 'locale']),
  (locale) => ({ locale })
)

const mapDispatchToProps = {
  change_locale: i18nActions.change_locale
}

export default connect(mapStateToProps, mapDispatchToProps)(ChangeLocale)
