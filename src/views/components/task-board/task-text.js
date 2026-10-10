import React from 'react'
import PropTypes from 'prop-types'

// Titles imported from GitHub keep a conventional-commit prefix ("feat:",
// "docs(cli):"). It is shown as a small kind label rather than as words.
const SUBJECT_PREFIX = /^([a-z]+)(?:\([^)]*\))?!?:\s+/i

export const parse_subject = (subject = '') => {
  const match = subject.match(SUBJECT_PREFIX)
  if (!match) return { kind: null, title: subject }
  const title = subject.slice(match[0].length)
  return {
    kind: match[1].toLowerCase(),
    title: title.charAt(0).toUpperCase() + title.slice(1)
  }
}

const URL_PATTERN = /(https?:\/\/[^\s<>()]+[^\s<>().,;:!?'"])/g

// Inline `code` spans, and links when asked for.
function InlineText({ text, links }) {
  return text.split(/(`[^`\n]+`)/g).map((part, index) => {
    if (/^`[^`]+`$/.test(part))
      return <code key={index}>{part.slice(1, -1)}</code>
    if (!links) return part
    return part.split(URL_PATTERN).map((piece, piece_index) =>
      piece_index % 2 ? (
        <a
          key={`${index}-${piece_index}`}
          href={piece}
          target='_blank'
          rel='noreferrer noopener nofollow'>
          {piece.replace(/^https?:\/\//, '')}
        </a>
      ) : (
        piece
      )
    )
  })
}

export function TaskTitle({ subject }) {
  const { kind, title } = parse_subject(subject)
  return (
    <>
      {kind && <span className='task-kind'>{kind}</span>}
      <InlineText text={title} />
    </>
  )
}

TaskTitle.propTypes = { subject: PropTypes.string }

// The "Board:" line a publisher appends points back at the board itself, so
// the board's own views drop it.
const BOARD_LINE = /^Board:\s+\S+\s*$/

export function TaskText({ content, hide_board_line }) {
  const lines = String(content || '')
    .split('\n')
    .filter((line) => !(hide_board_line && BOARD_LINE.test(line)))
  const text = lines.join('\n').trim()
  if (!text) return null
  return (
    <div className='task-text'>
      <InlineText text={text} links />
    </div>
  )
}

TaskText.propTypes = {
  content: PropTypes.string,
  hide_board_line: PropTypes.bool
}
