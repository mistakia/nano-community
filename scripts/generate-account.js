const yargs = require('yargs/yargs')
const { hideBin } = require('yargs/helpers')
// const { tools } = require('nanocurrency-web')

const argv = yargs(hideBin(process.argv)).argv

if (!argv.secret) {
  return console.log('missing --secret')
}

const main = async () => {
  /* const k = nacl.sign.keyPair()
   * const hex = Uint8Array.from(Buffer.from(argv.secret, 'hex'));
   * const key = nacl.sign.keyPair.fromSecretKey(hex)
   * const privateKey = ed.utils.randomPrivateKey()
   * const publicKey = await ed.getPublicKey(privateKey)
   * const hash = blake.blake2bHex(publicKey)
   * const signature = await ed.sign(hash, argv.secret)
   * const accountPublicKey = await ed.getPublicKey(argv.secret)

   * const signed = tools.sign(argv.secret, Buffer.from(publicKey).toString('hex'))

   * console.log(`secret key: ${privateKey.toString('hex')}`)
   * console.log(`public key: ${Buffer.from(publicKey).toString('hex')}`)
   * console.log(`account: ${accountPublicKey}`)
   * console.log(`signature: ${signature}`) */
}

try {
  main()
} catch (err) {
  console.log(err)
}
