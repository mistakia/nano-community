import React, { useState, useEffect } from 'react'

import Seo from '@components/seo'
import Menu from '@components/menu'
import RepresentativesSearch from '@components/representatives-search'
import Representatives from '@components/representatives'

function useWindowSize() {
  const [windowSize, setWindowSize] = useState({
    width: undefined,
    height: undefined
  })
  useEffect(() => {
    function handleResize() {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight
      })
    }
    window.addEventListener('resize', handleResize)
    handleResize()
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return windowSize
}

export default function TelemetryPage() {
  const window_size = useWindowSize()
  const table_height = Math.max(window_size.height - 48 - 16, 300) // height of search bar

  return (
    <>
      <Seo
        title='Nano Telemetry'
        description='Nano network telemetry explorer'
        tags={[
          'nano',
          'telemetry',
          'network',
          'representatives',
          'network',
          'crypto',
          'currency',
          'cryptocurrency',
          'digital',
          'money',
          'feeless',
          'energy',
          'green',
          'sustainable'
        ]}
      />
      <div className='representatives__body'>
        <div className='representatives__body-header'>
          <RepresentativesSearch />
        </div>
        <Representatives table_height={table_height} />
      </div>
      <div className='representatives__footer'>
        <Menu />
      </div>
    </>
  )
}
