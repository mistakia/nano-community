import debug from 'debug'

/* eslint-disable no-unused-vars */
import { request, isMain } from '#common'

const log = debug('script')
debug.enable('script')
/* eslint-enable no-unused-vars */

const script = async () => {
  // main
}

if (isMain(import.meta.url)) {
  const main = async () => {
    try {
      await script()
    } catch (err) {
      console.log(err)
    }
    process.exit()
  }

  try {
    main()
  } catch (err) {
    console.log(err)
    process.exit()
  }
}

export default script
