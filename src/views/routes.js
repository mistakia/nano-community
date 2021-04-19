import React from 'react'
import { Route, Switch } from 'react-router'

import DocPage from '@pages/doc'
import HomePage from '@pages/home'

const Routes = () => (
  <Switch>
    <Route exact path='/' component={HomePage} />
    <Route path='/*' component={DocPage} />
  </Switch>
)

export default Routes
