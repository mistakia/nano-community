import React from 'react'
import * as timeago from 'timeago.js'
import ImmutablePropTypes from 'react-immutable-proptypes'
import Skeleton from '@material-ui/lab/Skeleton'
import Accordion from '@material-ui/core/Accordion'
import AccordionSummary from '@material-ui/core/AccordionSummary'
import AccordionDetails from '@material-ui/core/AccordionDetails'
import ExpandMoreIcon from '@material-ui/icons/ExpandMore'
import markdown from 'markdown-it'
import mdTasks from 'markdown-it-task-checkbox'

// import GithubLabels from '@components/github-labels'

import './github-discussion.styl'

const md = markdown({ html: true }).use(mdTasks)

export default class GithubDiscussion extends React.Component {
  render() {
    const { discussion } = this.props

    if (!discussion.id) {
      return (
        <Accordion elevation={2} className='github__discussion'>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <div className='github__discussion-title'>
              <Skeleton height={30} />
            </div>
            <div className='github__discussion-meta'>
              <Skeleton animation='wave' width={200} />
            </div>
          </AccordionSummary>
        </Accordion>
      )
    }

    const html = md.render(discussion.body)

    return (
      <Accordion elevation={2} className='github__discussion'>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <a
            className='github__discussion-title'
            href={discussion.url}
            rel='noreferrer'
            target='_blank'>
            {discussion.title}
          </a>
          <div className='github__discussion-meta'>
            <div>
              {discussion.repo}#{discussion.ref}
            </div>
            <div>{discussion.actor_name}</div>
            <div>{timeago.format(discussion.updated_at * 1000)}</div>
          </div>
          {/* <GithubLabels labels={discussion.labels} /> */}
        </AccordionSummary>
        <AccordionDetails>
          <div
            className='github__discussion-body'
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </AccordionDetails>
      </Accordion>
    )
  }
}

GithubDiscussion.propTypes = {
  discussion: ImmutablePropTypes.record
}
