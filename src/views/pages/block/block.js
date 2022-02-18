import React from 'react'
import PropTypes from 'prop-types'
import ImmutablePropTypes from 'react-immutable-proptypes'
import LinearProgress from '@material-ui/core/LinearProgress'
import { Link } from 'react-router-dom'
import FilterNoneIcon from '@material-ui/icons/FilterNone'
import IconButton from '@material-ui/core/IconButton'
import copy from 'copy-text-to-clipboard'
import Tooltip from '@material-ui/core/Tooltip'

import Seo from '@components/seo'
import BlockInfo from '@components/block-info'
import DisplayNano from '@components/display-nano'
import DisplayRaw from '@components/display-raw'
import Menu from '@components/menu'

import './block.styl'

const getBlockType = (block) => {
  const type = block.getIn(['blockInfo', 'contents', 'type'])
  const subtype = block.getIn(['blockInfo', 'subtype'])

  if (subtype === 'send' || type === 'send') {
    return 'send'
  } else if (subtype === 'receive' || type === 'receive') {
    return 'receive'
  } else if (subtype === 'change' || type === 'change') {
    return 'change'
  } else if (subtype === 'epoch' || type === 'epoch') {
    return 'epoch'
  } else {
    return 'open'
  }
}

function BlockOperation({ type, block }) {
  const sourceAccount =
    block.getIn(['blockInfo', 'source_account']) ||
    block.getIn(['blockInfo', 'contents', 'source'])
  const destinationAccount =
    block.getIn(['blockInfo', 'contents', 'link_as_account']) ||
    block.getIn(['blockInfo', 'contents', 'destination'])
  const votingWeight =
    block.getIn(['blockInfo', 'contents', 'balance']) ||
    block.getIn(['blockInfo', 'balance'])

  switch (type) {
    case 'send':
      return (
        <div className='block__action send'>
          <div className='section__heading'>Receiving Account</div>
          <div className='block__link-account'>
            <Link to={`/${destinationAccount}`}>
              {block.linkAccountAlias ||
                `${destinationAccount.slice(0, 15)}...`}
            </Link>
          </div>
          <div className='section__heading'>Amount</div>
          <div className='block__amount'>
            <DisplayNano value={block.getIn(['blockInfo', 'amount'])} />
            <DisplayRaw value={block.getIn(['blockInfo', 'amount'])} />
          </div>
        </div>
      )

    case 'receive':
      return (
        <div className='block__action receive'>
          <div className='section__heading'>Sending Account</div>
          <div className='block__link-account'>
            <Link to={`/${sourceAccount}`}>
              {block.linkAccountAlias || `${sourceAccount.slice(0, 15)}...`}
            </Link>
          </div>
          <div className='section__heading'>Amount</div>
          <div className='block__amount'>
            <DisplayNano value={block.getIn(['blockInfo', 'amount'])} />
            <DisplayRaw value={block.getIn(['blockInfo', 'amount'])} />
          </div>
        </div>
      )

    case 'change':
      return (
        <div className='block__action change'>
          <div className='section__heading'>Delegated Representative</div>
          <div className='block__link-account'>
            <Link to={`/${block.blockInfo.contents.representative}`}>
              {block.linkAccountAlias ||
                `${block.blockInfo.contents.representative.slice(0, 15)}...`}
            </Link>
          </div>
          <div className='section__heading'>Voting Weight</div>
          <div className='block__amount'>
            <DisplayNano value={votingWeight} />
            <DisplayRaw value={votingWeight} />
          </div>
        </div>
      )

    case 'epoch': {
      if (
        block.blockInfo.contents.link ===
        '65706F636820763120626C6F636B000000000000000000000000000000000000'
      ) {
        return (
          <div className='block__action epoch'>
            <div className='section__heading'>Description</div>
            <div className='block__description'>
              Epoch v1 — Upgraded account-chains from legacy blocks (open,
              receive, send, change) to state blocks.
            </div>
          </div>
        )
      } else if (
        block.blockInfo.contents.link ===
        '65706F636820763220626C6F636B000000000000000000000000000000000000'
      ) {
        return (
          <div className='block__action epoch'>
            <div className='section__heading'>Description</div>
            <div className='block__description'>
              Epoch v2 - Upgraded account-chains to use higher Proof-of-Work
              difficulty.
            </div>
          </div>
        )
      } else {
        return null
      }
    }

    case 'open':
      return (
        <div className='block__action open'>
          <div className='section__heading'>Sending Account</div>
          <div className='block__link-account'>
            <Link to={`/${sourceAccount}`}>
              {block.linkAccountAlias || `${sourceAccount.slice(0, 15)}...`}
            </Link>
          </div>
          <div className='section__heading'>Amount</div>
          <div className='block__amount'>
            <DisplayNano value={block.getIn(['blockInfo', 'amount'])} />
            <DisplayRaw value={block.getIn(['blockInfo', 'amount'])} />
          </div>
        </div>
      )
  }
}

BlockOperation.propTypes = {
  block: ImmutablePropTypes.record,
  type: PropTypes.string
}

export default class BlockPage extends React.Component {
  componentDidMount() {
    const { hash } = this.props.match.params
    this.props.getBlock(hash)
  }

  componentDidUpdate(prevProps) {
    const { hash } = this.props.match.params
    const prevHash = prevProps.match.params.hash
    if (hash !== prevHash) {
      this.props.getBlock(hash)
    }
  }

  handleClick = () => {
    const { hash } = this.props.match.params
    copy(hash)
    this.props.showNotification({
      message: 'Block hash copied',
      severity: 'success'
    })
  }

  render() {
    const { block } = this.props
    const { hash } = this.props.match.params

    const isLoading = block.get('isLoading')
    const type = getBlockType(block)

    return (
      <>
        <Seo
          title={`Nano Block — ${hash}`}
          description='Information related to a Nano Block'
          tags={['nano', 'block', 'network', 'account', 'hash']}
        />
        <div className='block__container'>
          <div className='block__hash'>
            <span className='section__label'>Block Hash</span>
            <div>{hash}</div>
            {!isLoading && (
              <Tooltip title='click to copy'>
                <IconButton
                  className='section__copy'
                  onClick={this.handleClick}>
                  <FilterNoneIcon />
                </IconButton>
              </Tooltip>
            )}
          </div>
          {isLoading && (
            <LinearProgress
              color='secondary'
              style={{ width: '100%', margin: '32px' }}
            />
          )}
          {!isLoading && (
            <>
              <BlockInfo type={type} block={block} />
              <BlockOperation type={type} block={block} />
            </>
          )}
        </div>
        {!isLoading && (
          <div className='block__footer'>
            <Menu />
          </div>
        )}
      </>
    )
  }
}

BlockPage.propTypes = {
  match: PropTypes.object,
  block: ImmutablePropTypes.record,
  getBlock: PropTypes.func,
  showNotification: PropTypes.func
}
