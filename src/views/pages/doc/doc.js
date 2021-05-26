/* global REPO */

import React from 'react'
React.useLayoutEffect = React.useEffect
import { renderToString } from 'react-dom/server'
import PropTypes from 'prop-types'
import marked from 'marked'
import * as timeago from 'timeago.js'
import Skeleton from '@material-ui/lab/Skeleton'
import ImmutablePropTypes from 'react-immutable-proptypes'
import Button from '@material-ui/core/Button'
import Avatar from '@material-ui/core/Avatar'
import AvatarGroup from '@material-ui/lab/AvatarGroup'
import Tooltip from '@material-ui/core/Tooltip'
import Network from '@components/network'
import Github from '@components/github'
import fm from 'front-matter'
import LinkIcon from '@material-ui/icons/Link'
import IconButton from '@material-ui/core/IconButton'
import copy from 'copy-text-to-clipboard'

import { BASE_URL } from '@core/constants'
import Menu from '@components/menu'
import Seo from '@components/seo'

import './doc.styl'

const renderer = {
  heading(text, level) {
    const escapedText = text.toLowerCase().replace(/[^\w]+/g, '-')

    const link = renderToString(
      <div className='doc__header-link' data-anchor={escapedText}>
        <LinkIcon />
      </div>
    )

    return `
            <h${level} class="doc__header" id=${escapedText}>
              ${text}
              ${link}
            </h${level}>`
  }
}

marked.use({ renderer })

export default class DocPage extends React.Component {
  get path() {
    const path = this.props.location.pathname
    return path.endsWith('/') ? path.slice(0, -1) : path
  }

  componentDidMount() {
    this.props.getDoc(this.path)
  }

  handleClick = (e) => {
    const elem = e.path.find((p) => p.className === 'doc__header-link')
    const anchor = elem.dataset.anchor
    const url = `${BASE_URL}${this.path}#${anchor}`
    copy(url)
    this.props.showNotification({
      message: 'copied',
      severity: 'success'
    })
  }

  componentDidUpdate(prevProps) {
    if (this.props.location.hash) {
      const elem = document.getElementById(
        this.props.location.hash.substring(1)
      )
      if (elem) elem.scrollIntoView()
    }

    if (
      this.props.location.path === prevProps.location.path &&
      this.props.location.hash !== prevProps.location.hash
    ) {
      return
    }

    const headers = document.querySelectorAll('.doc__header-link')
    for (const header of headers) {
      header.addEventListener('click', this.handleClick)
    }

    const location = JSON.stringify(this.props.location)
    const prevLocation = JSON.stringify(prevProps.location)
    if (location !== prevLocation) {
      this.props.getDoc(this.path)
    }
  }

  render() {
    const { doc } = this.props

    const author = doc.getIn(['commit', 'commit', 'author', 'name'])
    const lastUpdated = doc.getIn(['commit', 'commit', 'author', 'date'])
    const commitHref = doc.getIn(['commit', 'html_url'])

    const authors = []
    doc.get('authors').forEach((author, index) => {
      authors.push(
        <Tooltip key={index} title={author.login}>
          <Avatar alt={author.login} src={author.avatar_url} />
        </Tooltip>
      )
    })

    if (doc.isPending) {
      return (
        <>
          <div className='doc__content'>
            <Skeleton height={80} width={200} />
            <Skeleton height={20} />
            <Skeleton height={20} animation={false} />
            <Skeleton height={20} animation='wave' />
            <Skeleton height={20} />
            <Skeleton height={30} width={300} style={{ marginTop: '32px' }} />
            <Skeleton height={20} animation={false} />
            <Skeleton height={20} animation='wave' />
            <Skeleton height={20} />
            <Skeleton height={20} animation={false} />
            <Skeleton height={20} animation='wave' />
          </div>
          <Menu />
        </>
      )
    }

    if (doc.isLoaded && !doc.content) {
      return (
        <>
          <div className='doc__content'>
            <h1>404</h1>
            <p>Document not found</p>
          </div>
          <Menu />
        </>
      )
    }

    const frontmatter = fm(doc.content)
    const { title, description, tags } = frontmatter.attributes
    const html = marked(frontmatter.body)

    return (
      <>
        <Seo
          title={title}
          description={description}
          tags={tags ? tags.split(',').map((t) => t.trim()) : []}
          path={this.path}
        />
        <div className='doc__content'>
          <div dangerouslySetInnerHTML={{ __html: html }} />
        </div>
        <div className='doc__content-side'>
          {Boolean(authors.length) && (
            <AvatarGroup max={6} className='doc__content-authors'>
              {authors}
            </AvatarGroup>
          )}
          {Boolean(authors.length) && (
            <div className='doc__content-contributors'>
              {authors.length} Contibutor{authors.length !== 1 ? 's' : ''}.{' '}
              <a
                href='https://github.com/mistakia/nano-community/blob/main/CONTRIBUTING.md'
                target='_blank'>
                Help out
              </a>
            </div>
          )}
          {Boolean(author) && (
            <div className='doc__content-author'>
              updated by{' '}
              <a href={commitHref} target='_blank'>
                {author} {timeago.format(lastUpdated)}
              </a>
            </div>
          )}
          <Button
            variant='outlined'
            href={`https://github.com/${REPO}/tree/main/docs${this.path}.md`}
            target='_blank'
            className='doc__content-edit'>
            Edit Page
          </Button>
          <Menu />
          <Network />
          <Github />
        </div>
      </>
    )
  }
}

DocPage.propTypes = {
  getDoc: PropTypes.func,
  location: PropTypes.object,
  doc: ImmutablePropTypes.record
}
