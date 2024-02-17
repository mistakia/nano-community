import React, { useEffect } from 'react'
import PropTypes from 'prop-types'
import ImmutablePropTypes from 'react-immutable-proptypes'
import { List } from 'immutable'
import { GithubIssue as GithubIssueRecord } from '@core/github-issues'
import { useTranslation } from 'react-i18next'

import Seo from '@components/seo'
import Menu from '@components/menu'
import Discussion from '@components/github-discussion'
import GithubIssue from '@components/github-issue'
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

const Tasklist = ({ title, description, tasks, is_pending }) => {
  let issues_skeletons = new List()
  if (is_pending) {
    issues_skeletons = issues_skeletons.push(new GithubIssueRecord())
    issues_skeletons = issues_skeletons.push(new GithubIssueRecord())
    issues_skeletons = issues_skeletons.push(new GithubIssueRecord())
  } else if (!tasks.size) {
    return null
  }

  const items = (tasks.size ? tasks : issues_skeletons).map((item, key) => (
    <GithubIssue key={key} issue={item} hide_status_label />
  ))

  return (
    <div className='roadmap__tasklist'>
      <div className='roadmap__tasklist-title'>
        <div className='header__container'>
          <div className='header__title'>
            <h2>{title}</h2>
            {Boolean(description) && <span>{description}</span>}
            <div className='roadmap__tasklist-count'>{tasks.size}</div>
          </div>
        </div>
      </div>
      <div className='roadmap__tasklist-tasks'>{items}</div>
    </div>
  )
}

Tasklist.propTypes = {
  title: PropTypes.string,
  description: PropTypes.string,
  tasks: ImmutablePropTypes.list,
  is_pending: PropTypes.bool
}

export default function RoadmapPage({
  discussions,
  in_progress_tasks,
  planned_tasks,
  blocked_tasks,
  deferred_tasks,
  no_status_tasks,
  discussions_is_pending,
  issues_is_pending,
  load_github_discussions,
  load_github_issues
}) {
  const { t } = useTranslation()

  useEffect(() => {
    load_github_discussions()
    load_github_issues({
      repos: ['mistakia/nano-community'],
      state: 'open'
    })
  }, [])

  useEffect(() => {
    if (!issues_is_pending) {
      const taskboard = document.querySelector('.roadmap__taskboard')
      const adjust_alignment = () => {
        if (taskboard) {
          // Calculate the total width of all children (tasklists) including gaps
          const totalWidth =
            Array.from(taskboard.children).reduce((total, child) => {
              return total + child.offsetWidth + 16 // Assuming 16px is the gap between tasklists
            }, 0) - 16 // Subtract the last gap

          // Compare total width of content with the viewport width
          if (totalWidth < window.innerWidth) {
            taskboard.style.justifyContent = 'center'
          } else {
            taskboard.style.justifyContent = 'flex-start'
          }
        }
      }

      adjust_alignment()
      window.addEventListener('resize', adjust_alignment)

      return () => {
        window.removeEventListener('resize', adjust_alignment)
      }
    }
  }, [issues_is_pending])

  let discussions_skeletons = new List()
  if (discussions_is_pending) {
    discussions_skeletons = discussions_skeletons.push(new GithubDiscussion())
    discussions_skeletons = discussions_skeletons.push(new GithubDiscussion())
    discussions_skeletons = discussions_skeletons.push(new GithubDiscussion())
  } else if (!discussions.size) {
    return null
  }

  const items = (discussions.size ? discussions : discussions_skeletons).map(
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
        <div className='roadmap__header'>
          <h1>Community Roadmap</h1>
        </div>
        <div className='roadmap__taskboard'>
          <Tasklist
            title='No Status'
            description='backlog'
            tasks={no_status_tasks}
            is_pending={issues_is_pending}
          />
          <Tasklist
            title='Planned'
            description='ready to be started'
            tasks={planned_tasks}
            is_pending={issues_is_pending}
          />
          <Tasklist
            title='In Progress'
            tasks={in_progress_tasks}
            is_pending={issues_is_pending}
          />
          <Tasklist
            title='Blocked'
            tasks={blocked_tasks}
            is_pending={issues_is_pending}
          />
          <Tasklist
            title='Deferred'
            tasks={deferred_tasks}
            is_pending={issues_is_pending}
          />
        </div>
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
      </div>
      <div className='roadmap__footer'>
        <Menu hideSearch />
      </div>
    </>
  )
}

RoadmapPage.propTypes = {
  load_github_discussions: PropTypes.func,
  load_github_issues: PropTypes.func,
  discussions: ImmutablePropTypes.list,
  in_progress_tasks: ImmutablePropTypes.list,
  planned_tasks: ImmutablePropTypes.list,
  blocked_tasks: ImmutablePropTypes.list,
  deferred_tasks: ImmutablePropTypes.list,
  no_status_tasks: ImmutablePropTypes.list,
  discussions_is_pending: PropTypes.bool,
  issues_is_pending: PropTypes.bool
}
