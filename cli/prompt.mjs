import readline from 'readline'
import { Writable } from 'stream'

// Line prompts on node:readline. One interface reads stdin for the whole run,
// and its line iterator buffers, so answers piped in before a prompt is asked
// are kept rather than dropped. A hidden prompt mutes the terminal echo.

let rl = null
let line_iterator = null
let echo_muted = false

const terminal_output = new Writable({
  write(chunk, encoding, callback) {
    if (!echo_muted) process.stdout.write(chunk, encoding)
    callback()
  }
})

const open = () => {
  if (rl) return
  rl = readline.createInterface({
    input: process.stdin,
    output: terminal_output,
    prompt: '',
    // No line history, so a typed private key is not kept in it
    historySize: 0,
    terminal: Boolean(process.stdin.isTTY)
  })
  line_iterator = rl[Symbol.asyncIterator]()
  rl.on('SIGINT', () => {
    echo_muted = false
    process.stdout.write('\n')
    rl.close()
    process.exit(130)
  })
}

// The next line of input, or null once stdin has ended
const next_line = async () => (await line_iterator.next()).value ?? null

// The prompt goes through readline, which redraws it on a line edit
const show_prompt = (question) => {
  open()
  rl.setPrompt(`? ${question} `)
  rl.prompt(true)
}

export async function ask(question) {
  show_prompt(question)
  return next_line()
}

// For a secret: what is typed is not echoed to the terminal
export async function ask_hidden(question) {
  show_prompt(question)
  echo_muted = true
  try {
    return await next_line()
  } finally {
    echo_muted = false
    if (process.stdin.isTTY) process.stdout.write('\n')
  }
}

// Only y or yes confirms, and an empty answer is a no. Input that ends before
// the answer is a failure, so a script one answer short does not exit 0.
export async function confirm(question) {
  const answer = await ask(`${question} (y/N)`)
  if (answer === null) throw new Error('Input ended before the confirmation')
  return /^y(es)?$/i.test(answer.trim())
}

export function close_prompts() {
  if (rl) rl.close()
}
