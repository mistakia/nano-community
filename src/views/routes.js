import React from 'react'
import { Route, Switch } from 'react-router'

import AccountPage from '@pages/account'
import BlockPage from '@pages/block'
import DocPage from '@pages/doc'
import HomePage from '@pages/home'
import RoadmapPage from '@pages/roadmap'
import LedgerPage from '@pages/ledger'
import NotFoundPage from '@pages/not-found'
import RepresentativesPage from '@pages/representatives'
import TelemetryPage from '@pages/telemetry'
import LabelPage from '@pages/label'
import LivePage from '@pages/live'
import { SUPPORTED_LOCALES } from '@core/constants'

const Routes = () => (
  <Switch>
    <Route exact path='/' component={HomePage} />
    <Route exact path='/live' component={LivePage} />
    <Route exact path='/roadmap' component={RoadmapPage} />
    <Route exact path='/ledger' component={LedgerPage} />
    <Route exact path='/representatives' component={RepresentativesPage} />
    <Route exact path='/telemetry' component={TelemetryPage} />
    <Route exact path='/labels/:label' component={LabelPage} />
    <Route exact path='/404.html' component={NotFoundPage} />
    <Route
      exact
      path={
        '/:prefix(nano_|xrb_):address([13]{1}[13456789abcdefghijkmnopqrstuwxyz]{59})'
      }
      component={AccountPage}
    />
    <Route exact path={'/:hash([0-9A-F]{64})'} component={BlockPage} />
    <Route
      path={`/:locale(${SUPPORTED_LOCALES.join('|')})/*`}
      component={DocPage}
    />
    <Route path='/*' component={DocPage} />
  </Switch>
)

export default Routes
