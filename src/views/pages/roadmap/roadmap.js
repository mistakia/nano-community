import React, { useEffect } from 'react'
import PropTypes from 'prop-types'
import ImmutablePropTypes from 'react-immutable-proptypes'
import { List } from 'immutable'
import { useTranslation } from 'react-i18next'

import Seo from '@components/seo'
import Menu from '@components/menu'
import Discussion from '@components/github-discussion'
import { GithubDiscussion } from '@core/github-discussions'

import './roadmap.styl'

const MenuCard = ({ title, description, url }) => (
  <div className='roadmap__link menu__section'>
    <a href={url} target='_blank' rel='noreferrer'>
      <div className='menu__heading'>{title}</div>
      {Boolean(description) && (
        <div className='roadmap__link-description'>{description}</div>
      )}
    </a>
  </div>
)

MenuCard.propTypes = {
  title: PropTypes.string,
  description: PropTypes.string,
  url: PropTypes.string
}

export default function RoadmapPage({ load, discussions, is_pending }) {
  const { t } = useTranslation()
  useEffect(() => {
    load()
  }, [])

  let skeletons = new List()
  if (is_pending) {
    for (let i = 0; i < 3; i++) {
      skeletons = skeletons.push(new GithubDiscussion())
    }
  } else if (!discussions.size) {
    return null
  }

  const items = (discussions.size ? discussions : skeletons).map(
    (item, key) => <Discussion key={key} discussion={item} />
  )

  return (
    <>
      <Seo
        title={t('roadmap.seo.title', 'Roadmap')}
        description={t(
          'roadmap.seo.description',
          'Nano development & community roadmap'
        )}
        tags={t('roadmap.seo.tags', [
          'roadmap',
          'nano',
          'future',
          'release',
          'design',
          'tasks',
          'discussions',
          'community',
          'ambassadors',
          'managers'
        ])}
      />
      <div className='roadmap__container'>
        <div className='roadmap__main'>
          <div className='header__container'>
            <div className='header__title'>
              <h1>{t('roadmap.header.title', 'Planning')}</h1>
              <span>
                {t('roadmap.header.subtitle', 'Community objectives')}
              </span>
            </div>
          </div>
          <div className='roadmap__body'>{items}</div>
        </div>
        <div className='roadmap__side'>
          <Menu hideSearch />
        </div>
      </div>
    </>
  )
}

RoadmapPage.propTypes = {
  load: PropTypes.func,
  discussions: ImmutablePropTypes.list,
  is_pending: PropTypes.bool
}
