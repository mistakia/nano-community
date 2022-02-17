import React from 'react'
import PropTypes from 'prop-types'
import ImmutablePropTypes from 'react-immutable-proptypes'
import { List } from 'immutable'
import Card from '@material-ui/core/Card'
import CardActionArea from '@material-ui/core/CardActionArea'
import CardContent from '@material-ui/core/CardContent'
import Typography from '@material-ui/core/Typography'
import Grid from '@material-ui/core/Grid'

import Seo from '@components/seo'
import Menu from '@components/menu'
import Issue from '@components/issue'
import { GithubIssue } from '@core/github-issues'

import './roadmap.styl'

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
        <div className='issues__container'>
          <Grid container spacing={2}>
            <Grid item sm={6}>
              <Card variant='outlined'>
                <CardActionArea
                  onClick={() =>
                    window.open(
                      'https://docs.nano.org/releases/network-upgrades/'
                    )
                  }>
                  <CardContent>
                    <Typography gutterBottom variant='h5' component='h2'>
                      Network Upgrades
                    </Typography>
                    <Typography
                      variant='body2'
                      color='textSecondary'
                      component='p'>
                      Lizards are a widespread group of squamate reptiles, with
                      over 6,000 species, ranging across all continents except
                      Antarctica
                    </Typography>
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>
            <Grid item sm={6}>
              <Card variant='outlined'>
                <CardActionArea
                  onClick={() =>
                    window.open(
                      'https://github.com/orgs/nanocurrency/projects/5'
                    )
                  }>
                  <CardContent>
                    <Typography gutterBottom variant='h5' component='h2'>
                      Refrence Implementation
                    </Typography>
                    <Typography
                      variant='body2'
                      color='textSecondary'
                      component='p'>
                      Lizards are a widespread group of squamate reptiles, with
                      over 6,000 species, ranging across all continents except
                      Antarctica
                    </Typography>
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>
            <Grid item sm={12}>
              <Card variant='outlined'>
                <CardActionArea
                  onClick={() =>
                    window.open(
                      'https://docs.nano.org/releases/node-releases/#next-planned-release'
                    )
                  }>
                  <CardContent>
                    <Typography gutterBottom variant='h5' component='h2'>
                      Node Releases
                    </Typography>
                    <Typography
                      variant='body2'
                      color='textSecondary'
                      component='p'>
                      Lizards are a widespread group of squamate reptiles, with
                      over 6,000 species, ranging across all continents except
                      Antarctica
                    </Typography>
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>
          </Grid>
          <Grid container>
            <Grid item xs>
              <Typography gutterBottom variant='h5' component='h2'>
                Community Objectives & Key Results
              </Typography>
            </Grid>
          </Grid>
          <Typography gutterBottom variant='h5' component='h2'>
            Community Tasks
          </Typography>
          <div className='issues__body'>{items}</div>
          <Menu />
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
