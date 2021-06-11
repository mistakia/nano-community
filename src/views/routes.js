import React from 'react'
import { Route, Switch } from 'react-router'

import DocPage from '@pages/doc'
import HomePage from '@pages/home'
import NetworkPage from '@pages/network'
import RepresentativesPage from '@pages/representatives'
import NotFoundPage from '@pages/not-found'

const Routes = () => (
  <Switch>
    <Route exact path='/' component={HomePage} />
    <Route exact path='/network' component={NetworkPage} />
    <Route exact path='/representatives' component={RepresentativesPage} />
    <Route exact path='/404.html' component={NotFoundPage} />
    <Route path='/*' component={DocPage} />
  </Switch>
)

export default Routes
