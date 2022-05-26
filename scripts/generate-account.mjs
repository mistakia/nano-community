import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import nano from 'nanocurrency'
import { tools, wallet } from 'nanocurrency-web'

const argv = yargs(hideBin(process.argv)).argv

if (!argv.secret) {
  console.log('missing --secret')
  process.exit()
}

const generateAccount = async () => {
  let publicKey = argv.key
  if (!argv.key) {
    const w = wallet.generateLegacy()
    const account = w.accounts[0]
    publicKey = account.publicKey
  }

  // sign new public key with account secret key
  const signature = tools.sign(argv.secret, publicKey)

  const accountPublicKey = nano.derivePublicKey(argv.secret)
  const accountAddress = nano.deriveAddress(accountPublicKey)

  console.log(`public key: ${publicKey}`)
  console.log(`signature: ${signature}`)
  console.log(`address: ${accountAddress}`)
}

try {
  generateAccount()
} catch (err) {
  console.log(err)
}
