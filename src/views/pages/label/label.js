/* global REPO */

import React from 'react'
import PropTypes from 'prop-types'
import ImmutablePropTypes from 'react-immutable-proptypes'
import Skeleton from '@mui/material/Skeleton'
import fm from 'front-matter'
import Button from '@mui/material/Button'
import Avatar from '@mui/material/Avatar'
import AvatarGroup from '@mui/material/AvatarGroup'
import Tooltip from '@mui/material/Tooltip'
import markdown from 'markdown-it'
import * as timeago from 'timeago.js'

import Seo from '@components/seo'
import Menu from '@components/menu'
import Posts from '@components/posts'
import Network from '@components/network'
import GithubEvents from '@components/github-events'

export default class LabelPage extends React.Component {
  get path() {
    const path = this.props.location.pathname
    return path.endsWith('/') ? path.slice(0, -1) : path
  }

  componentDidMount() {
    this.props.getLabelDoc(this.path)
  }

  render() {
    const {
      doc,
      match: { params }
    } = this.props

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
          <div className='doc__content markdown__content'>
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
          <div className='doc__content-side'>
            <div className='doc__content-side-head' />
            <Menu />
          </div>
        </div>
      )
    }

    if (doc.isLoaded && !doc.content) {
      return (
        <div className='doc__container'>
          <div className='doc__content markdown__content'>
            <h1>404</h1>
            <p>Topic not found</p>
          </div>
          <div className='doc__content-side'>
            <div className='doc__content-side-head' />
            <Menu />
          </div>
        </div>
      )
    }

    const frontmatter = fm(doc.content)
    const { title, description, tags } = frontmatter.attributes
    const md = markdown({ html: true })
    const html = md.render(frontmatter.body)

    return (
      <div className='doc__container'>
        <Seo
          title={title}
          description={description}
          tags={tags ? tags.split(',').map((t) => t.trim()) : []}
          path={this.path}
        />
        <div className='doc__content markdown__content'>
          <div dangerouslySetInnerHTML={{ __html: html }} />
          <Posts title='Discussions' id='labels' label={params.label} />
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
                  {authors.length} Contibutor{authors.length !== 1 ? 's' : ''}.{' '}
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
          <Menu />
          <Network />
          <GithubEvents />
        </div>
      </div>
    )
  }
}

LabelPage.propTypes = {
  getLabelDoc: PropTypes.func,
  match: PropTypes.object,
  doc: ImmutablePropTypes.record,
  location: PropTypes.object
}
