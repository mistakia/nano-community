import React, { Suspense } from 'react'
import {
  Route,
  Routes,
  matchPath,
  useLocation,
  useParams
} from 'react-router-dom'

import lazy_page, { ChunkLoadBoundary } from '@views/lazy-page'
import DynamicPage, { DocPage, preload_dynamic } from '@pages/dynamic'

const HomePage = lazy_page(
  () => import(/* webpackChunkName: "page-home" */ '@pages/home')
)
const LedgerPage = lazy_page(
  () => import(/* webpackChunkName: "page-ledger" */ '@pages/ledger')
)
const NotFoundPage = lazy_page(
  () => import(/* webpackChunkName: "page-not-found" */ '@pages/not-found')
)
const RepresentativesPage = lazy_page(
  () =>
    import(
      /* webpackChunkName: "page-representatives" */ '@pages/representatives'
    )
)
const TelemetryPage = lazy_page(
  () => import(/* webpackChunkName: "page-telemetry" */ '@pages/telemetry')
)
const NetworkEventsPage = lazy_page(
  () =>
    import(
      /* webpackChunkName: "page-network-events" */ '@pages/network-events'
    )
)
const LabelPage = lazy_page(
  () => import(/* webpackChunkName: "page-label" */ '@pages/label')
)
const LivePage = lazy_page(
  () => import(/* webpackChunkName: "page-live" */ '@pages/live')
)
const TaskBoardPage = lazy_page(
  () => import(/* webpackChunkName: "page-task-board" */ '@pages/task-board')
)
const TaskPage = lazy_page(
  () => import(/* webpackChunkName: "page-task" */ '@pages/task')
)
const TaskAccountPage = lazy_page(
  () =>
    import(/* webpackChunkName: "page-task-account" */ '@pages/task-account')
)
const NewTaskPage = lazy_page(
  () => import(/* webpackChunkName: "page-task-new" */ '@pages/task-new')
)

function LabelPageWrapper() {
  const location = useLocation()
  const params = useParams()
  return <LabelPage location={location} match={{ params }} />
}

function DocPageWrapper() {
  const location = useLocation()
  return <DocPage location={location} />
}

// Each route path with the lazy page it loads and the element it renders.
const ROUTES = [
  ['/', HomePage],
  ['/live', LivePage],
  ['/roadmap', TaskBoardPage],
  ['/roadmap/account', TaskAccountPage],
  ['/roadmap/new', NewTaskPage],
  ['/task/:issue_event_id', TaskPage],
  ['/ledger', LedgerPage],
  ['/representatives', RepresentativesPage],
  ['/telemetry', TelemetryPage],
  ['/network-events', NetworkEventsPage],
  ['/labels/:label', LabelPage, LabelPageWrapper],
  ['/404.html', NotFoundPage]
]

// Load the chunk the current URL renders, before the first render.
export const preload_route = (pathname) => {
  for (const [path, Page] of ROUTES) {
    if (matchPath(path, pathname)) return Page.preload()
  }
  const dynamic = matchPath('/:id', pathname)
  if (dynamic) return preload_dynamic(dynamic.params.id)
  return DocPage.preload()
}

const AppRoutes = () => (
  <ChunkLoadBoundary>
    <Suspense fallback={null}>
      <Routes>
        {ROUTES.map(([path, Page, Element = Page]) => (
          <Route key={path} path={path} element={<Element />} />
        ))}
        <Route path='/:id' element={<DynamicPage />} />
        <Route path='/*' element={<DocPageWrapper />} />
      </Routes>
    </Suspense>
  </ChunkLoadBoundary>
)

export default AppRoutes
