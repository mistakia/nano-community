const Errors = require('./errors')
const RedditPost = require('./reddit-post')
const RedditComment = require('./reddit-comment')
const ForumPost = require('./forum-post')
const ForumComment = require('./forum-comment')
const TwitterTweet = require('./twitter-tweet')
const DiscordComment = require('./discord-comment')
const BitcointalkComment = require('./bitcointalk-comment')

const isURL = (text) => {
  const pattern =
    '^(https?:\\/\\/)?' + // protocol
    '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|' + // domain name
    '((\\d{1,3}\\.){3}\\d{1,3}))' + // OR ip (v4) address
    '(?::\\d{2,5})?' + // port
    '(?:/[^\\s]*)?$' // path

  const re = new RegExp(pattern, 'i')
  return re.test(text)
}

const main = async (url) => {
  if (!isURL(url)) {
    return Errors.InvalidUrlError()
  }

  if (RedditPost.re.test(url)) {
    return RedditPost(url)
  } else if (RedditComment.re.test(url)) {
    return RedditComment(url)
  } else if (DiscordComment.re.test(url)) {
    return DiscordComment(url)
  } else if (ForumComment.re.test(url)) {
    return ForumComment(url)
  } else if (ForumPost.re.test(url)) {
    return ForumPost(url)
  } else if (TwitterTweet.re.test(url)) {
    return TwitterTweet(url)
    /* } else if (BitcointalkComment.re.test(url)) {
     *   return BitcointalkComment(url) */
  } else {
    return Errors.UnknownUrlError()
  }
}

if (!module.parent) {
  const yargs = require('yargs/yargs')
  const { hideBin } = require('yargs/helpers')
  const argv = yargs(hideBin(process.argv)).argv

  const init = async () => {
    await main(argv.url)
    process.exit()
  }

  try {
    init()
  } catch (err) {
    console.log(err)
  }
}
