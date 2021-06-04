const yargs = require('yargs/yargs')
const { hideBin } = require('yargs/helpers')
const nano = require('nanocurrency')
const { tools, wallet } = require('nanocurrency-web')

const argv = yargs(hideBin(process.argv)).argv

if (!argv.secret) {
  console.log('missing --secret')
  process.exit()
}

const main = async () => {
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
  main()
} catch (err) {
  console.log(err)
}
