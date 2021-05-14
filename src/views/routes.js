import React from 'react'
import { Route, Switch } from 'react-router'

import DocPage from '@pages/doc'
import HomePage from '@pages/home'
import NotFoundPage from '@pages/not-found'

const Routes = () => (
  <Switch>
    <Route exact path='/' component={HomePage} />
    <Route exact path='/404.html' component={NotFoundPage} />
    <Route path='/*' component={DocPage} />
  </Switch>
)

export default Routes
