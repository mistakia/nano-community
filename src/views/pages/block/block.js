import React, { useEffect } from 'react'
import PropTypes from 'prop-types'
import ImmutablePropTypes from 'react-immutable-proptypes'
import LinearProgress from '@mui/material/LinearProgress'
import { Link } from 'react-router-dom'
import FilterNoneIcon from '@mui/icons-material/FilterNone'
import IconButton from '@mui/material/IconButton'
import copy from 'copy-text-to-clipboard'
import Tooltip from '@mui/material/Tooltip'
import { useTranslation } from 'react-i18next'

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
  const { t } = useTranslation()

  const source_account =
    block.getIn(['blockInfo', 'source_account']) ||
    block.getIn(['blockInfo', 'contents', 'source'])
  const destination_account =
    block.getIn(['blockInfo', 'contents', 'link_as_account']) ||
    block.getIn(['blockInfo', 'contents', 'destination'])
  const voting_weight =
    block.getIn(['blockInfo', 'contents', 'balance']) ||
    block.getIn(['blockInfo', 'balance'])

  switch (type) {
    case 'send':
      return (
        <div className='block__action send'>
          <div className='section__heading'>
            {t('block_page.receiving_account', 'Receiving Account')}
          </div>
          <div className='block__link-account'>
            <Link to={`/${destination_account}`}>
              {block.linkAccountAlias ||
                `${destination_account.slice(0, 15)}...`}
            </Link>
          </div>
          <div className='section__heading'>
            {t('block_page.amount', 'Amount')}
          </div>
          <div className='block__amount'>
            <DisplayNano value={block.getIn(['blockInfo', 'amount'])} />
            <DisplayRaw value={block.getIn(['blockInfo', 'amount'])} />
          </div>
        </div>
      )

    case 'receive':
      return (
        <div className='block__action receive'>
          <div className='section__heading'>
            {t('block_page.sending_account', 'Sending Account')}
          </div>
          <div className='block__link-account'>
            <Link to={`/${source_account}`}>
              {block.linkAccountAlias || `${source_account.slice(0, 15)}...`}
            </Link>
          </div>
          <div className='section__heading'>
            {t('block_page.amount', 'Amount')}
          </div>
          <div className='block__amount'>
            <DisplayNano value={block.getIn(['blockInfo', 'amount'])} />
            <DisplayRaw value={block.getIn(['blockInfo', 'amount'])} />
          </div>
        </div>
      )

    case 'change':
      return (
        <div className='block__action change'>
          <div className='section__heading'>
            {t(
              'block_page.delegated_representative',
              'Delegated Representative'
            )}
          </div>
          <div className='block__link-account'>
            <Link to={`/${block.blockInfo.contents.representative}`}>
              {block.linkAccountAlias ||
                `${block.blockInfo.contents.representative.slice(0, 15)}...`}
            </Link>
          </div>
          <div className='section__heading'>
            {t('block_page.voting_weight', 'Voting Weight')}
          </div>
          <div className='block__amount'>
            <DisplayNano value={voting_weight} />
            <DisplayRaw value={voting_weight} />
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
            <div className='section__heading'>
              {t('block_page.description', 'Description')}
            </div>
            <div className='block__description'>
              {t(
                'block_page.epoch_v1',
                'Epoch v1 — Upgraded account-chains from legacy blocks (open, receive, send, change) to state blocks.'
              )}
            </div>
          </div>
        )
      } else if (
        block.blockInfo.contents.link ===
        '65706F636820763220626C6F636B000000000000000000000000000000000000'
      ) {
        return (
          <div className='block__action epoch'>
            <div className='section__heading'>
              {t('block_page.description', 'Description')}
            </div>
            <div className='block__description'>
              {t(
                'block_page.epoch_v2',
                'Epoch v2 - Upgraded account-chains to use higher Proof-of-Work difficulty.'
              )}
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
          <div className='section__heading'>
            {t('block_page.sending_account', 'Sending Account')}
          </div>
          <div className='block__link-account'>
            <Link to={`/${source_account}`}>
              {block.linkAccountAlias || `${source_account.slice(0, 15)}...`}
            </Link>
          </div>
          <div className='section__heading'>
            {t('block_page.amount', 'Amount')}
          </div>
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

export default function BlockPage({
  block,
  getBlock,
  showNotification,
  match
}) {
  const { t } = useTranslation()
  const { hash } = match.params

  useEffect(() => {
    getBlock(hash)
  }, [hash])

  const handleClick = () => {
    copy(hash)
    showNotification({
      message: t('block_page.copy_notification', 'Block hash copied'),
      severity: 'success'
    })
  }

  const is_loading = block.get('isLoading')
  const type = getBlockType(block)

  return (
    <>
      <Seo
        title={t('block_page.seo_title', {
          hash,
          defaultValue: `Nano Block — ${hash}`
        })}
        description={t(
          'block_page.seo_description',
          'Information related to a Nano Block'
        )}
        tags={['nano', 'block', 'network', 'account', 'hash']}
      />
      <div className='block__container'>
        <div className='block__hash'>
          <span className='section__label'>
            {t('block_page.section_label', 'Block Hash')}
          </span>
          <div>{hash}</div>
          {!is_loading && (
            <Tooltip title={t('common.click_to_copy', 'click to copy')}>
              <IconButton className='section__copy' onClick={handleClick}>
                <FilterNoneIcon />
              </IconButton>
            </Tooltip>
          )}
        </div>
        {is_loading && (
          <LinearProgress
            color='error'
            style={{ width: '100%', margin: '32px' }}
          />
        )}
        {!is_loading && (
          <>
            <BlockInfo type={type} block={block} />
            <BlockOperation type={type} block={block} />
          </>
        )}
      </div>
      {!is_loading && (
        <div className='block__footer'>
          <Menu />
        </div>
      )}
    </>
  )
}

BlockPage.propTypes = {
  match: PropTypes.object,
  block: ImmutablePropTypes.record,
  getBlock: PropTypes.func,
  showNotification: PropTypes.func
}
