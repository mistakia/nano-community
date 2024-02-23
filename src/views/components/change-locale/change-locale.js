import React from 'react'
import PropTypes from 'prop-types'
import FormControl from '@material-ui/core/FormControl'
import Select from '@material-ui/core/Select'
import MenuItem from '@material-ui/core/MenuItem'
import SvgIcon from '@material-ui/core/SvgIcon'

import './change-locale.styl'

function TranslateIcon(props) {
  return (
    <SvgIcon {...props} viewBox='0 0 16 16'>
      <path d='M4.545 6.714 4.11 8H3l1.862-5h1.284L8 8H6.833l-.435-1.286zm1.634-.736L5.5 3.956h-.049l-.679 2.022z' />
      <path d='M0 2a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v3h3a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-3H2a2 2 0 0 1-2-2zm2-1a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1h7a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1zm7.138 9.995q.289.451.63.846c-.748.575-1.673 1.001-2.768 1.292.178.217.451.635.555.867 1.125-.359 2.08-.844 2.886-1.494.777.665 1.739 1.165 2.93 1.472.133-.254.414-.673.629-.89-1.125-.253-2.057-.694-2.82-1.284.681-.747 1.222-1.651 1.621-2.757H14V8h-3v1.047h.765c-.318.844-.74 1.546-1.272 2.13a6 6 0 0 1-.415-.492 2 2 0 0 1-.94.31' />
    </SvgIcon>
  )
}

export default function ChangeLocale({ change_locale, locale }) {
  const locale_texts = {
    ar: 'العربية',
    en: 'English',
    es: 'Español',
    fa: 'فارسی',
    fr: 'Français',
    hi: 'हिन्दी',
    it: 'Italiano',
    ja: '日本語',
    de: 'Deutsch',
    nl: 'Nederlands',
    ru: 'Русский',
    ko: '한국어',
    pl: 'Polski',
    pt: 'Português',
    tr: 'Türkçe'
  }

  return (
    <FormControl className='change-locale'>
      <Select
        labelId='change-locale'
        id='change-locale'
        value={locale}
        variant='outlined'
        onChange={(event) => change_locale(event.target.value)}
        native={false}
        renderValue={(selected) => (
          <>
            <TranslateIcon
              style={{ marginRight: '8px', verticalAlign: 'middle' }}
            />
            {locale_texts[selected]}
          </>
        )}>
        {Object.entries(locale_texts).map(([value, text]) => (
          <MenuItem key={value} value={value}>
            {text}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  )
}

ChangeLocale.propTypes = {
  change_locale: PropTypes.func.isRequired,
  locale: PropTypes.string.isRequired
}
