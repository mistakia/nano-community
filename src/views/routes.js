import React from 'react'
import { Route, Routes, useLocation, useParams } from 'react-router-dom'

import DocPage from '@pages/doc'
import DynamicPage from '@pages/dynamic'
import HomePage from '@pages/home'
import RoadmapPage from '@pages/roadmap'
import LedgerPage from '@pages/ledger'
import NotFoundPage from '@pages/not-found'
import RepresentativesPage from '@pages/representatives'
import TelemetryPage from '@pages/telemetry'
import LabelPage from '@pages/label'
import LivePage from '@pages/live'

function LabelPageWrapper() {
  const location = useLocation()
  const params = useParams()
  return <LabelPage location={location} match={{ params }} />
}

function DocPageWrapper() {
  const location = useLocation()
  return <DocPage location={location} />
}

const AppRoutes = () => (
  <Routes>
    <Route path='/' element={<HomePage />} />
    <Route path='/live' element={<LivePage />} />
    <Route path='/roadmap' element={<RoadmapPage />} />
    <Route path='/ledger' element={<LedgerPage />} />
    <Route path='/representatives' element={<RepresentativesPage />} />
    <Route path='/telemetry' element={<TelemetryPage />} />
    <Route path='/labels/:label' element={<LabelPageWrapper />} />
    <Route path='/404.html' element={<NotFoundPage />} />
    <Route path='/:id' element={<DynamicPage />} />
    <Route path='/*' element={<DocPageWrapper />} />
  </Routes>
)

export default AppRoutes
