import React from 'react'
import PropTypes from 'prop-types'
import Helmet from 'react-helmet'

import { BASE_URL } from '@core/constants'

const absoluteUrl = (path) => `${BASE_URL}${path}`
const seoImageURL = (file) => `${BASE_URL}/resources/${file}`

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
    // { name: 'twitter:title', content: `${title} | nano.community` },
    // { name: 'twitter:description', content: description },
    // { name: 'twitter:creator', content: twitter || '@username' },
    { property: 'og:title', content: `${title} | Nano.Community` },
    { property: 'og:type', content: contentType },
    { property: 'og:url', content: url },
    { property: 'og:description', content: description },
    { property: 'og:site_name', content: 'Nano.Community' },
    { property: 'og:locale', content: 'en_EN' }
    // { name: 'fb:app_id', content: '<FB App ID>' },
  ]

  if (published)
    metaTags.push({ name: 'article:published_time', content: published })
  if (updated)
    metaTags.push({ name: 'article:modified_time', content: updated })
  if (category) metaTags.push({ name: 'article:section', content: category })
  if (tags) {
    metaTags.push({ name: 'article:tag', content: tags })
    metaTags.push({ name: 'keywords', content: tags })
  }
  if (image) {
    metaTags.push({ itemprop: 'image', content: seoImageURL(image) })
    // metaTags.push({ name: 'twitter:image:src', content: seoImageURL(image) });
    metaTags.push({ property: 'og:image', content: seoImageURL(image) })
    // metaTags.push({ name: 'twitter:card', content: 'summary_large_image' });
  } else {
    metaTags.push({ name: 'twitter:card', content: 'summary' })
  }

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
  path,
  contentType = 'website',
  published,
  updated,
  category,
  tags,
  twitter
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
      url: absoluteUrl(path),
      published,
      updated,
      category,
      tags,
      twitter
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
  twitter: PropTypes.string,
  image: PropTypes.string
}

export default Seo
