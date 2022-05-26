import NanoNode, { NanoConstants } from 'nano-node-light'
import debug from 'debug'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'

const argv = yargs(hideBin(process.argv)).argv
const log = debug('nano-network-monitor')
debug.enable('nano-network-monitor,node')

const getNetwork = (network = 'beta') => {
  switch (network) {
    case 'live':
      return NanoConstants.NETWORK.LIVE
    case 'beta':
      return NanoConstants.NETWORK.BETA
    case 'test':
      return NanoConstants.NETWORK.TEST
    default:
      return NanoConstants.NETWORK.BETA
  }
}

const network = getNetwork(argv.network)
const config = {
  network,
  requestTelemetry: argv.telemetry
}
const node = new NanoNode(config)

node.on('error', (error, address) => {
  console.log(address)
  console.log(error)
})

node.on('telemetry', (telemetry) => {
  log(telemetry)
})

// connect to network bootstrap peers
node.connectDomain({
  address: network.ADDRESS,
  port: network.PORT
})
