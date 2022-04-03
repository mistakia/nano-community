import React from 'react'
import PropTypes from 'prop-types'
import ImmutablePropTypes from 'react-immutable-proptypes'
import { List } from 'immutable'
import Grid from '@material-ui/core/Grid'

import Seo from '@components/seo'
import Menu from '@components/menu'
import Issue from '@components/issue'
import { GithubIssue } from '@core/github-issues'

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
    const { issues, isPending } = this.props

    let skeletons = new List()
    if (isPending) {
      skeletons = skeletons.push(new GithubIssue())
      skeletons = skeletons.push(new GithubIssue())
      skeletons = skeletons.push(new GithubIssue())
    } else if (!issues.size) {
      return null
    }

    const items = (issues.size ? issues : skeletons).map((item, key) => (
      <Issue key={key} issue={item} />
    ))

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
            'issues',
            'community',
            'ambassadors',
            'managers'
          ]}
        />
        <div className='roadmap__container'>
          <div className='roadmap__main'>
            <div className='header__container'>
              <div className='header__title'>
                <span>Community objectives & key results</span>
              </div>
            </div>
            <div className='roadmap__body'>{items}</div>
          </div>
          <div className='roadmap__side'>
            <Grid container>
              <Grid item sm={12}>
                <MenuCard
                  title='Node Development'
                  description='GitHub issue board of the major features to give a consolidated view of the current development roadmap'
                  url='https://github.com/orgs/nanocurrency/projects/5'
                />
              </Grid>
              <Grid item sm={12} container>
                <MenuCard
                  title='Network Upgrades'
                  url='https://docs.nano.org/releases/network-upgrades/'
                />
              </Grid>
              <Grid item sm={12} container>
                <MenuCard
                  title='Node Releases'
                  url='https://docs.nano.org/releases/node-releases/#next-planned-release'
                />
              </Grid>
            </Grid>
            <Menu />
          </div>
        </div>
      </>
    )
  }
}

RoadmapPage.propTypes = {
  load: PropTypes.func,
  issues: ImmutablePropTypes.list,
  isPending: PropTypes.bool
}
