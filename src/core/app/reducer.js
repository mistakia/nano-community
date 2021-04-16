import { Record } from 'immutable'

const initialState = new Record({
  token: null,
  key: null
})

export function appReducer(state = initialState(), { payload, type }) {
  switch (type) {
    default:
      return state
  }
}
