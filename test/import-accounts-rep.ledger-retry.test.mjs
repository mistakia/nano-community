/* global describe afterEach it */
import chai from 'chai'
import nock from 'nock'

import { rpc } from '#common'
import { fetch_ledger_page } from '#root/scripts/import-accounts-rep.mjs'

const expect = chai.expect

const LEDGER_REQUEST_PARAMETERS = {
  account: 'nano_1111111111111111111111111111111111111111111111111111hifc8npp',
  count: 5000,
  representative: true
}
const LEDGER_PAGE = { accounts: {} }

// A request_ledger_page stub that answers each attempt from `responses` in
// order and records the parameters it was called with.
const create_ledger_page_stub = (responses) => {
  const calls = []
  const request_ledger_page = async (params) => {
    calls.push(params)
    return responses[calls.length - 1]
  }
  return { calls, request_ledger_page }
}

const create_wait_recorder = () => {
  const waits = []
  const wait_before_retry = async (milliseconds) => {
    waits.push(milliseconds)
  }
  return { waits, wait_before_retry }
}

describe('import-accounts-rep ledger retry', function () {
  afterEach(() => {
    nock.cleanAll()
  })

  it('returns a first-attempt success without waiting', async () => {
    const { calls, request_ledger_page } = create_ledger_page_stub([
      LEDGER_PAGE
    ])
    const { waits, wait_before_retry } = create_wait_recorder()

    const response = await fetch_ledger_page({
      ledger_request_params: LEDGER_REQUEST_PARAMETERS,
      request_ledger_page,
      wait_before_retry
    })

    expect(response).to.equal(LEDGER_PAGE)
    expect(calls).to.have.length(1)
    expect(waits).to.deep.equal([])
  })

  it('retries an empty response and returns the next success', async () => {
    const { calls, request_ledger_page } = create_ledger_page_stub([
      null,
      LEDGER_PAGE
    ])
    const { waits, wait_before_retry } = create_wait_recorder()

    const response = await fetch_ledger_page({
      ledger_request_params: LEDGER_REQUEST_PARAMETERS,
      request_ledger_page,
      wait_before_retry
    })

    expect(response).to.equal(LEDGER_PAGE)
    expect(calls).to.have.length(2)
    expect(waits).to.deep.equal([10000])
  })

  it('throws the rpc error once the retries are exhausted', async () => {
    const node_error = { error: 'Bad account number' }
    const { calls, request_ledger_page } = create_ledger_page_stub([
      node_error,
      node_error,
      node_error,
      node_error
    ])
    const { waits, wait_before_retry } = create_wait_recorder()

    let thrown
    try {
      await fetch_ledger_page({
        ledger_request_params: LEDGER_REQUEST_PARAMETERS,
        request_ledger_page,
        wait_before_retry
      })
    } catch (error) {
      thrown = error
    }

    expect(thrown).to.be.an('error')
    expect(thrown.message).to.equal('Bad account number')
    expect(calls).to.have.length(4)
    expect(waits).to.deep.equal([10000, 30000, 60000])
  })

  it('throws Empty RPC Response when every attempt returns nothing', async () => {
    const { request_ledger_page } = create_ledger_page_stub([
      null,
      null,
      null,
      null
    ])
    const { wait_before_retry } = create_wait_recorder()

    let thrown
    try {
      await fetch_ledger_page({
        ledger_request_params: LEDGER_REQUEST_PARAMETERS,
        request_ledger_page,
        wait_before_retry
      })
    } catch (error) {
      thrown = error
    }

    expect(thrown.message).to.equal('Empty RPC Response')
  })

  it('passes the ledger request timeout and the page parameters on every attempt', async () => {
    const { calls, request_ledger_page } = create_ledger_page_stub([
      null,
      LEDGER_PAGE
    ])
    const { wait_before_retry } = create_wait_recorder()

    await fetch_ledger_page({
      ledger_request_params: LEDGER_REQUEST_PARAMETERS,
      request_ledger_page,
      wait_before_retry
    })

    for (const call of calls) {
      expect(call).to.deep.equal({
        ...LEDGER_REQUEST_PARAMETERS,
        timeout: 90000
      })
    }
  })

  it('applies the rpc.ledger timeout to the node request', async () => {
    const node_url = 'http://ledger-timeout-test.invalid:7076'
    nock(node_url).post('/').delay(500).reply(200, LEDGER_PAGE)

    let thrown
    try {
      await rpc.ledger({ url: node_url, timeout: 50 })
    } catch (error) {
      thrown = error
    }

    // node-fetch's FetchError; 'request-timeout' is the header-phase timer
    expect(thrown.type).to.equal('request-timeout')
    expect(thrown.message).to.include('network timeout')
  })
})
