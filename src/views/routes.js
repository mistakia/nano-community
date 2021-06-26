import React from 'react'
import { Route, Switch } from 'react-router'

import DocPage from '@pages/doc'
import HomePage from '@pages/home'
import NetworkPage from '@pages/network'
import RepresentativesPage from '@pages/representatives'
import TagsPage from '@pages/tags'
import NotFoundPage from '@pages/not-found'
import RepresentativePage from '@pages/representative'

const Routes = () => (
  <Switch>
    <Route exact path='/' component={HomePage} />
    <Route exact path='/tags/:tag' component={TagsPage} />
    <Route exact path='/network' component={NetworkPage} />
    <Route exact path='/representatives' component={RepresentativesPage} />
    <Route exact path='/404.html' component={NotFoundPage} />
    <Route
      exact
      path={
        '/:prefix(nano_|xrb_):address([13]{1}[13456789abcdefghijkmnopqrstuwxyz]{59})'
      }
      component={RepresentativePage}
    />
    <Route path='/*' component={DocPage} />
  </Switch>
)

export default Routes
