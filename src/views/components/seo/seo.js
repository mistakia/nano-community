import React from 'react'
import PropTypes from 'prop-types'
import Helmet from 'react-helmet'

import history from '@core/history'
import { BASE_URL } from '@core/constants'

const absoluteUrl = (path) => `${BASE_URL}${path}`

const getMetaTags = ({
  title,
  description,
  url,
  contentType,
  published,
  updated,
  category,
  tags,
  twitter,
  image
}) => {
  const metaTags = [
    { itemprop: 'name', content: title },
    { itemprop: 'description', content: description },
    { name: 'description', content: description },
    // { name: 'twitter:site', content: '@username' },
    // { name: 'twitter:creator', content: twitter || '@username' },
    { property: 'og:title', content: title },
    { property: 'og:type', content: contentType },
    { property: 'og:url', content: url },
    { property: 'og:description', content: description },
    { property: 'og:site_name', content: 'Nano.Community' },
    { property: 'og:locale', content: 'en_EN' },
    // { name: 'fb:app_id', content: '<FB App ID>' },

    { property: 'twitter:title', content: title },
    { property: 'twitter:description', content: description },
    { property: 'twitter:domain', content: 'nano.community' },
    { property: 'twitter:url', content: url }
  ]

  if (published) {
    metaTags.push({ name: 'article:published_time', content: published })
  }

  if (updated) {
    metaTags.push({ name: 'article:modified_time', content: updated })
  }

  if (category) {
    metaTags.push({ name: 'article:section', content: category })
  }

  if (tags) {
    metaTags.push({ name: 'article:tag', content: tags })
    metaTags.push({ name: 'keywords', content: tags })
  }

  if (image) {
    metaTags.push({ itemprop: 'image', content: absoluteUrl(image) })
    metaTags.push({ property: 'og:image', content: absoluteUrl(image) })
    metaTags.push({ property: 'twitter:image', content: absoluteUrl(image) })
  }

  metaTags.push({ property: 'twitter:card', content: 'summary' })

  return metaTags
}

const getHtmlAttributes = ({ schema }) => {
  let result = {
    lang: 'en'
  }
  if (schema) {
    result = {
      ...result,
      itemscope: undefined,
      itemtype: `http://schema.org/${schema}`
    }
  }
  return result
}

getHtmlAttributes.propTypes = {
  schema: PropTypes.string
}

const Seo = ({
  schema,
  title,
  description,
  path = history.location.pathname,
  contentType = 'website',
  image = '/resources/symbol-white.png',
  published,
  updated,
  category,
  tags
}) => (
  <Helmet
    htmlAttributes={getHtmlAttributes({
      schema
    })}
    title={title}
    link={[{ rel: 'canonical', href: absoluteUrl(path) }]}
    meta={getMetaTags({
      title,
      description,
      contentType,
      image,
      url: absoluteUrl(path),
      published,
      updated,
      category,
      tags
    })}
  />
)

Seo.propTypes = {
  schema: PropTypes.string,
  title: PropTypes.string,
  description: PropTypes.string,
  path: PropTypes.string,
  contentType: PropTypes.string,
  published: PropTypes.string,
  updated: PropTypes.string,
  category: PropTypes.string,
  tags: PropTypes.array,
  image: PropTypes.string
}

export default Seo
