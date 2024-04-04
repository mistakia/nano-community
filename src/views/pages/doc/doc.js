/* global REPO */

import React, { useEffect } from 'react'
import { useParams, useHistory } from 'react-router-dom'
import { renderToString } from 'react-dom/server'
import PropTypes from 'prop-types'
import * as timeago from 'timeago.js'
import Skeleton from '@mui/material/Skeleton'
import ImmutablePropTypes from 'react-immutable-proptypes'
import Button from '@mui/material/Button'
import Avatar from '@mui/material/Avatar'
import AvatarGroup from '@mui/material/AvatarGroup'
import Tooltip from '@mui/material/Tooltip'
import fm from 'front-matter'
import LinkIcon from '@mui/icons-material/Link'
import copy from 'copy-text-to-clipboard'
import markdown from 'markdown-it'
import codetabs from 'markdown-it-codetabs'
import anchor from 'markdown-it-anchor'
import hljs from 'highlight.js/lib/core'
import javascript from 'highlight.js/lib/languages/javascript'
import python from 'highlight.js/lib/languages/python'
import bash from 'highlight.js/lib/languages/bash'
import powershell from 'highlight.js/lib/languages/powershell'
import diff from 'highlight.js/lib/languages/diff'
import { useTranslation } from 'react-i18next'

import 'highlight.js/styles/github.css'

import { BASE_URL, SUPPORTED_LOCALES } from '@core/constants'
import Menu from '@components/menu'
import Seo from '@components/seo'

hljs.registerLanguage('diff', diff)
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
  const escaped_text = text.toLowerCase().replace(/[^\w]+/g, '-')

  return `<${tag} class="doc__header" id=${escaped_text}>`
}

export default function DocPage({
  getDoc,
  showNotification,
  doc,
  location,
  change_locale
}) {
  const { t, i18n } = useTranslation()
  const history = useHistory()

  let { locale } = useParams()

  const path = location.pathname.endsWith('/')
    ? location.pathname.slice(0, -1).replace(`/${locale}`, '')
    : location.pathname.replace(`/${locale}`, '')
  useEffect(() => {
    if (!locale) {
      locale = i18n.language
      history.push(`/${locale}${path}`)
    } else {
      if (SUPPORTED_LOCALES.includes(locale)) {
        change_locale({ locale, save: false })
      } else {
        locale = i18n.language
      }
    }
    getDoc({ id: path, locale })
  }, [getDoc, path, locale, i18n])

  const handle_click = (e) => {
    const event_path = e.composedPath()
    const element = event_path.find((p) => p.className === 'doc__header-link')
    const anchor = element ? element.dataset.anchor : ''
    const url = `${BASE_URL}${path}#${anchor}`
    copy(url)
    showNotification({
      message: t('doc.section_link_copied', 'Section link copied'),
      severity: 'success'
    })
  }

  useEffect(() => {
    if (location.hash) {
      const elem = document.getElementById(location.hash.substring(1))
      if (elem) elem.scrollIntoView()
    }

    const headers = document.querySelectorAll('.doc__header-link')
    headers.forEach((header) => {
      header.addEventListener('click', handle_click)
    })

    return () =>
      headers.forEach((header) => {
        header.removeEventListener('click', handle_click)
      })
  }, [location, handle_click])

  const author = doc.getIn(['commit', 'commit', 'author', 'name'])
  const last_updated = doc.getIn(['commit', 'commit', 'author', 'date'])
  const commit_href = doc.getIn(['commit', 'html_url'])

  const authors = []
  doc.get('authors', []).forEach((author, index) => {
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
          <h1>{t('doc.not_found_404', '404')}</h1>
          <p>
            {t('doc.document_not_found', 'Document (or Account) not found')}
          </p>
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
  const html = md
    .render(frontmatter.body)
    .replace(
      /<code>#([a-z0-9]{6})<\/code>/gi,
      '<code style="background:#$1">#$1</code>'
    )

  return (
    <div className='doc__container'>
      <Seo
        title={title}
        description={description}
        tags={tags ? tags.split(',').map((t) => t.trim()) : []}
        path={path}
      />
      <div className='doc__content markdown__content'>
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
                {authors.length} {t('doc.contributors', 'Contributor')}
                {authors.length !== 1 ? 's' : ''}.{' '}
                <a
                  href='https://github.com/mistakia/nano-community/blob/main/CONTRIBUTING.md'
                  rel='noreferrer'
                  target='_blank'>
                  {t('doc.help_out', 'Help out')}
                </a>
              </div>
            )}
            {Boolean(author) && (
              <div className='doc__content-author'>
                {t('doc.updated_by', 'updated by')}{' '}
                <a href={commit_href} target='_blank' rel='noreferrer'>
                  {author} {timeago.format(last_updated)}
                </a>
              </div>
            )}
          </div>
          <Button
            variant='outlined'
            href={`https://github.com/${REPO}/tree/main/docs/${locale}${path}.md`}
            target='_blank'
            className='doc__content-edit'>
            {t('doc.edit_page', 'Edit Page')}
          </Button>
        </div>
        <Menu hideSearch />
      </div>
    </div>
  )
}

DocPage.propTypes = {
  getDoc: PropTypes.func,
  showNotification: PropTypes.func,
  location: PropTypes.object,
  doc: ImmutablePropTypes.record,
  change_locale: PropTypes.func
}
