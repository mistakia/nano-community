import React from 'react'

import './menu.styl'

export default class Menu extends React.Component {
  render() {
    return (
      <div className='menu__container'>
        <div className='menu__section'>
          <div className='menu__heading'>Introduction</div>
          <div className='menu__links'>
            <a>Basics</a>
            <a>How It Works</a>
            <a>Why it matters</a>
            <a>Misconceptions</a>
            <a>History</a>
            <a>FAQs</a>
          </div>
        </div>
        <div className='menu__section'>
          <div className='menu__heading'>Get Started</div>
          <div className='menu__links'>
            <a>Basics</a>
            <a>Storing</a>
            <a>Acquiring</a>
            <a>Using</a>
            <a>Best Practices</a>
          </div>
        </div>
        <div className='menu__section'>
          <div className='menu__heading'>Learn & Get Help</div>
          <div className='menu__links'>
            <a>Design</a>
            <a>Advantages</a>
            <a>Attack Vectors</a>
            <a>Challenges</a>
            <a>Roadmap</a>
            <a>Support</a>
          </div>
        </div>
        <div className='menu__section'>
          <div className='menu__heading'>Developers</div>
          <div className='menu__links'>
            <a>Getting Started</a>
            <a>Running a node</a>
            <a>Tutorials</a>
            <a>Documentation</a>
            <a>Software</a>
            <a>Integration</a>
            <a>Whitepaper</a>
          </div>
        </div>
        <div className='menu__section'>
          <div className='menu__heading'>Get Involved</div>
          <div className='menu__links'>
            <a>Contributing</a>
            <a>Discussions</a>
          </div>
        </div>
      </div>
    )
  }
}
