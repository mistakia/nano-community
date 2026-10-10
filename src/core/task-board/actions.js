export const task_board_actions = {
  TASK_BOARD_INIT: 'TASK_BOARD_INIT',
  TASK_BOARD_EVENTS_RECEIVED: 'TASK_BOARD_EVENTS_RECEIVED',
  TASK_BOARD_LOADED: 'TASK_BOARD_LOADED',
  TASK_BOARD_RELAY_ERROR: 'TASK_BOARD_RELAY_ERROR',
  TASK_BOARD_PUBLISH: 'TASK_BOARD_PUBLISH',
  TASK_BOARD_PUBLISH_PENDING: 'TASK_BOARD_PUBLISH_PENDING',
  TASK_BOARD_PUBLISH_FULFILLED: 'TASK_BOARD_PUBLISH_FULFILLED',
  TASK_BOARD_PUBLISH_FAILED: 'TASK_BOARD_PUBLISH_FAILED',

  init: ({ board, relays }) => ({
    type: task_board_actions.TASK_BOARD_INIT,
    payload: { board, relays }
  }),

  events_received: ({ events }) => ({
    type: task_board_actions.TASK_BOARD_EVENTS_RECEIVED,
    payload: { events }
  }),

  loaded: () => ({ type: task_board_actions.TASK_BOARD_LOADED }),

  relay_error: ({ relay, error }) => ({
    type: task_board_actions.TASK_BOARD_RELAY_ERROR,
    payload: { relay, error }
  }),

  // build is (board) => unsigned template; issue_id names the task the action
  // concerns, so the claimant's active claim on it is renewed alongside.
  publish: ({ key, build, issue_id = null, on_published = null }) => ({
    type: task_board_actions.TASK_BOARD_PUBLISH,
    payload: { key, build, issue_id, on_published }
  }),

  publish_pending: ({ key }) => ({
    type: task_board_actions.TASK_BOARD_PUBLISH_PENDING,
    payload: { key }
  }),

  publish_fulfilled: ({ key, event }) => ({
    type: task_board_actions.TASK_BOARD_PUBLISH_FULFILLED,
    payload: { key, event }
  }),

  publish_failed: ({ key, error }) => ({
    type: task_board_actions.TASK_BOARD_PUBLISH_FAILED,
    payload: { key, error }
  })
}
