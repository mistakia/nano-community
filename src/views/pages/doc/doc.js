/* global REPO */

import React from 'react'
import { renderToString } from 'react-dom/server'
import PropTypes from 'prop-types'
import * as timeago from 'timeago.js'
import Skeleton from '@material-ui/lab/Skeleton'
import ImmutablePropTypes from 'react-immutable-proptypes'
import Button from '@material-ui/core/Button'
import Avatar from '@material-ui/core/Avatar'
import AvatarGroup from '@material-ui/lab/AvatarGroup'
import Tooltip from '@material-ui/core/Tooltip'
import fm from 'front-matter'
import LinkIcon from '@material-ui/icons/Link'
import copy from 'copy-text-to-clipboard'
import markdown from 'markdown-it'
import codetabs from 'markdown-it-codetabs'
import anchor from 'markdown-it-anchor'
import hljs from 'highlight.js/lib/core'
import javascript from 'highlight.js/lib/languages/javascript'
import python from 'highlight.js/lib/languages/python'
import bash from 'highlight.js/lib/languages/bash'
import powershell from 'highlight.js/lib/languages/powershell'

import 'highlight.js/styles/github.css'

import { BASE_URL } from '@core/constants'
import Menu from '@components/menu'
import Seo from '@components/seo'

hljs.registerLanguage('js', javascript)
hljs.registerLanguage('python', python)
hljs.registerLanguage('bash', bash)
hljs.registerLanguage('powershell', powershell)

const md = markdown({
  html: true,
  highlight: function (str, lang) {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return hljs.highlight(str, { language: lang }).value
      } catch (__) {}
    }

    return '' // use external default escaping
  }
})
md.use(codetabs)
md.use(anchor, {
  slugify: (s) => s.toLowerCase().replace(/[^\w]+/g, '-'),
  permalink: anchor.permalink.ariaHidden({
    placement: 'after',
    class: 'doc__header-link',
    symbol: renderToString(<LinkIcon />),
    renderAttrs: (slug) => ({ 'data-anchor': slug })
  })
})

md.renderer.rules.heading_open = (tokens, idx) => {
  const token = tokens[idx]
  const nextToken = tokens[idx + 1]
  const text = nextToken.content
  const tag = token.tag
  const escapedText = text.toLowerCase().replace(/[^\w]+/g, '-')

  return `<${tag} class="doc__header" id=${escapedText}>`
}

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
      message: 'Section link copied',
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
      this.props.location.pathname === prevProps.location.pathname &&
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
        <div className='doc__container'>
          <div className='doc__content'>
            <Skeleton height={80} width={200} style={{ marginTop: '32px' }} />
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
          <div className='doc__content-side'>
            <div className='doc__content-side-head' />
            <Menu hideSearch />
          </div>
        </div>
      )
    }

    if (doc.isLoaded && !doc.content) {
      return (
        <div className='doc__container'>
          <div className='doc__content'>
            <h1>404</h1>
            <p>Document (or Account) not found</p>
          </div>
          <div className='doc__content-side'>
            <div className='doc__content-side-head' />
            <Menu hideSearch />
          </div>
        </div>
      )
    }

    const frontmatter = fm(doc.content)
    const { title, description, tags } = frontmatter.attributes
    const html = md.render(frontmatter.body)

    return (
      <div className='doc__container'>
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
          <div className='doc__content-side-head'>
            <div className='doc__content-side-meta'>
              {Boolean(authors.length) && (
                <AvatarGroup max={6} className='doc__content-authors'>
                  {authors}
                </AvatarGroup>
              )}
              {Boolean(authors.length) && (
                <div className='doc__content-contributors'>
                  {authors.length} Contributor{authors.length !== 1 ? 's' : ''}.{' '}
                  <a
                    href='https://github.com/mistakia/nano-community/blob/main/CONTRIBUTING.md'
                    rel='noreferrer'
                    target='_blank'>
                    Help out
                  </a>
                </div>
              )}
              {Boolean(author) && (
                <div className='doc__content-author'>
                  updated by{' '}
                  <a href={commitHref} target='_blank' rel='noreferrer'>
                    {author} {timeago.format(lastUpdated)}
                  </a>
                </div>
              )}
            </div>
            <Button
              variant='outlined'
              href={`https://github.com/${REPO}/tree/main/docs${this.path}.md`}
              target='_blank'
              className='doc__content-edit'>
              Edit Page
            </Button>
          </div>
          <Menu hideSearch />
        </div>
      </div>
    )
  }
}

DocPage.propTypes = {
  getDoc: PropTypes.func,
  showNotification: PropTypes.func,
  location: PropTypes.object,
  doc: ImmutablePropTypes.record
}
