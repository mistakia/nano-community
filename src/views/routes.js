import React from 'react'
import { Route, Switch } from 'react-router'

import AccountPage from '@pages/account'
import BlockPage from '@pages/block'
import DocPage from '@pages/doc'
import HomePage from '@pages/home'
import RoadmapPage from '@pages/roadmap'
import LedgerPage from '@pages/ledger'
import NetworkPage from '@pages/network'
import NotFoundPage from '@pages/not-found'
import RepresentativesPage from '@pages/representatives'
import TagsPage from '@pages/tags'

const Routes = () => (
  <Switch>
    <Route exact path='/' component={HomePage} />
    <Route exact path='/roadmap' component={RoadmapPage} />
    <Route exact path='/ledger' component={LedgerPage} />
    <Route exact path='/network' component={NetworkPage} />
    <Route exact path='/representatives' component={RepresentativesPage} />
    <Route exact path='/tags/:tag' component={TagsPage} />
    <Route exact path='/404.html' component={NotFoundPage} />
    <Route
      exact
      path={
        '/:prefix(nano_|xrb_):address([13]{1}[13456789abcdefghijkmnopqrstuwxyz]{59})'
      }
      component={AccountPage}
    />
    <Route exact path={'/:hash([0-9A-F]{64})'} component={BlockPage} />
    <Route path='/*' component={DocPage} />
  </Switch>
)

export default Routes
