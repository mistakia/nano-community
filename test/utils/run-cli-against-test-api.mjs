// Runs the CLI against the API at NANO_TEST_CLI_API_URL. The published bin
// always sends to https://nano.community and has no setting that changes it,
// so the tests point it at their local server through main instead.
import { main } from '../../cli/index.mjs'

const api_url = process.env.NANO_TEST_CLI_API_URL
if (!api_url) throw new Error('NANO_TEST_CLI_API_URL is not set')
process.exitCode = await main(process.argv.slice(2), { api_url })
