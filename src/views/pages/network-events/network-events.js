import React, { useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import { Link } from 'react-router-dom'
import dayjs from 'dayjs'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import MenuItem from '@mui/material/MenuItem'
import TextField from '@mui/material/TextField'

import Seo from '@components/seo'
import Menu from '@components/menu'
import { timeago } from '@core/utils'
import {
  NETWORK_EVENT_SEVERITIES,
  PUBLIC_NETWORK_EVENT_TYPES,
  get_network_event_type
} from '#common/network-event-types.mjs'

import './network-events.styl'

const PAGE_SIZE = 25
const ACCOUNT_RE = /^nano_[13][13456789abcdefghijkmnopqrstuwxyz]{59}$/

const PHASE_LABELS = {
  began: 'began',
  ended: 'ended',
  occurred: ''
}

const NetworkEventRow = ({ network_event }) => {
  const [expanded, set_expanded] = useState(false)
  const event_type = get_network_event_type(network_event.network_event_type)
  const account = network_event.representative_account
  const is_first_observation = Boolean(
    network_event.evidence?.first_observation
  )

  return (
    <div className={`network-event severity-${network_event.severity}`}>
      <div
        className='network-event__summary'
        onClick={() => set_expanded(!expanded)}>
        <Chip
          className={`network-event__severity ${network_event.severity}`}
          size='small'
          label={network_event.severity}
        />
        <div className='network-event__title'>
          {event_type ? event_type.label : network_event.network_event_type}{' '}
          {PHASE_LABELS[network_event.network_event_phase]}
          {is_first_observation && (
            <span className='network-event__first-observation'>
              present when monitoring began
            </span>
          )}
        </div>
        {account && (
          <Link
            className='network-event__account'
            to={`/${account}`}
            onClick={(event) => event.stopPropagation()}>
            {`${account.slice(0, 15)}...`}
          </Link>
        )}
        <div
          className='network-event__time'
          title={dayjs
            .unix(network_event.observed_at)
            .format('YYYY-MM-DD HH:mm')}>
          {timeago.format(network_event.observed_at * 1000, 'nano_short')}
        </div>
      </div>
      {expanded && (
        <div className='network-event__evidence'>
          <div>
            Observed{' '}
            {dayjs
              .unix(network_event.observed_at)
              .format('YYYY-MM-DD HH:mm:ss')}
            {network_event.peer_address &&
              ` · peer ${network_event.peer_address}`}
            {network_event.node_id && ` · node ${network_event.node_id}`}
          </div>
          <pre>{JSON.stringify(network_event.evidence, null, 2)}</pre>
        </div>
      )}
    </div>
  )
}

NetworkEventRow.propTypes = {
  network_event: PropTypes.object.isRequired
}

export default function NetworkEventsPage({
  network_events,
  is_loading,
  error,
  get_network_events
}) {
  const [network_event_type, set_network_event_type] = useState('')
  const [severity, set_severity] = useState('')
  const [account_input, set_account_input] = useState('')
  const [offset, set_offset] = useState(0)

  const representative_account = ACCOUNT_RE.test(account_input.trim())
    ? account_input.trim()
    : ''
  const is_account_invalid =
    Boolean(account_input.trim()) && !representative_account

  useEffect(() => {
    const params = { limit: PAGE_SIZE, offset }
    if (network_event_type) params.network_event_type = network_event_type
    if (severity) params.severity = severity
    if (representative_account) {
      params.representative_account = representative_account
    }
    get_network_events(params)
  }, [network_event_type, severity, representative_account, offset])

  const on_filter_change = (setter) => (event) => {
    setter(event.target.value)
    set_offset(0)
  }

  return (
    <>
      <Seo
        title='Nano Network Events'
        description='Dated history of Nano representative network events: address, node and version changes, and representatives falling behind'
        tags={[
          'nano',
          'network',
          'events',
          'representatives',
          'telemetry',
          'crypto',
          'currency',
          'cryptocurrency'
        ]}
      />
      <div className='network-events'>
        <h1>Network Events</h1>
        <div className='network-events__filters'>
          <TextField
            select
            size='small'
            label='Event'
            value={network_event_type}
            onChange={on_filter_change(set_network_event_type)}>
            <MenuItem value=''>All events</MenuItem>
            {PUBLIC_NETWORK_EVENT_TYPES.map((type) => (
              <MenuItem key={type} value={type}>
                {get_network_event_type(type).label}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            size='small'
            label='Severity'
            value={severity}
            onChange={on_filter_change(set_severity)}>
            <MenuItem value=''>All severities</MenuItem>
            {NETWORK_EVENT_SEVERITIES.map((value) => (
              <MenuItem key={value} value={value}>
                {value}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            size='small'
            label='Representative'
            placeholder='nano_...'
            value={account_input}
            error={is_account_invalid}
            helperText={is_account_invalid ? 'Not a nano address' : ''}
            onChange={on_filter_change(set_account_input)}
          />
        </div>
        <div className='network-events__list'>
          {error && (
            <div className='network-events__empty'>
              Network events could not be loaded.
            </div>
          )}
          {!error && !is_loading && !network_events.length && (
            <div className='network-events__empty'>
              No network events match these filters.
            </div>
          )}
          {network_events.map((network_event) => (
            <NetworkEventRow
              key={network_event.network_event_id}
              network_event={network_event}
            />
          ))}
        </div>
        <div className='network-events__paging'>
          <Button
            size='small'
            disabled={!offset || is_loading}
            onClick={() => set_offset(Math.max(0, offset - PAGE_SIZE))}>
            Newer
          </Button>
          <Button
            size='small'
            disabled={network_events.length < PAGE_SIZE || is_loading}
            onClick={() => set_offset(offset + PAGE_SIZE)}>
            Older
          </Button>
        </div>
      </div>
      <Menu />
    </>
  )
}

NetworkEventsPage.propTypes = {
  network_events: PropTypes.array.isRequired,
  is_loading: PropTypes.bool,
  error: PropTypes.string,
  get_network_events: PropTypes.func.isRequired
}
