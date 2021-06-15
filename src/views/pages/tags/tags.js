import React from 'react'
import PropTypes from 'prop-types'
import ImmutablePropTypes from 'react-immutable-proptypes'
import marked from 'marked'
import Skeleton from '@material-ui/lab/Skeleton'
import fm from 'front-matter'

import Seo from '@components/seo'
import Menu from '@components/menu'
import Posts from '@components/posts'
import Network from '@components/network'

export default class TagsPage extends React.Component {
  get path() {
    const path = this.props.location.pathname
    return path.endsWith('/') ? path.slice(0, -1) : path
  }

  componentDidMount() {
    this.props.getTagDoc(this.path)
  }

  render() {
    const {
      doc,
      match: { params }
    } = this.props

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
          <Posts title='Discussions' id='tags' tag={params.tag} />
        </div>
        <div className='doc__content-side'>
          <Menu />
          <Network />
        </div>
      </>
    )
  }
}

TagsPage.propTypes = {
  getTagDoc: PropTypes.func,
  match: PropTypes.object,
  doc: ImmutablePropTypes.record,
  location: PropTypes.object
}
