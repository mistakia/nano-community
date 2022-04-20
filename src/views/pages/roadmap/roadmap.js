import React from 'react'
import PropTypes from 'prop-types'
import ImmutablePropTypes from 'react-immutable-proptypes'
import { List } from 'immutable'

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

export default class RoadmapPage extends React.Component {
  componentDidMount() {
    this.props.load()
  }

  render() {
    const { discussions, isPending } = this.props

    let skeletons = new List()
    if (isPending) {
      skeletons = skeletons.push(new GithubDiscussion())
      skeletons = skeletons.push(new GithubDiscussion())
      skeletons = skeletons.push(new GithubDiscussion())
    } else if (!discussions.size) {
      return null
    }

    const items = (discussions.size ? discussions : skeletons).map(
      (item, key) => <Discussion key={key} discussion={item} />
    )

    return (
      <>
        <Seo
          title='Roadmap'
          description='Nano development & community roadmap'
          tags={[
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
          ]}
        />
        <div className='roadmap__container'>
          <div className='roadmap__main'>
            <div className='header__container'>
              <div className='header__title'>
                <h1>Planning</h1>
                <span>Community objectives</span>
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
}

RoadmapPage.propTypes = {
  load: PropTypes.func,
  discussions: ImmutablePropTypes.list,
  isPending: PropTypes.bool
}
