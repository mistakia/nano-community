import React from 'react'
import { createRoot } from 'react-dom/client'

import Root from '@views/root'

document.addEventListener('DOMContentLoaded', () => {
  const rootElement = document.getElementById('app')
  createRoot(rootElement).render(<Root />)
})
