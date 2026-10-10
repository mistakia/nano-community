import { createTheme } from '@mui/material/styles'

// The site's Material-UI theme, shared by the portal and the standalone task
// board client so both render the same buttons and tooltips.
const theme = createTheme({
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          fontFamily: "'IBM Plex Mono', monospace",
          border: '1px solid rgba(0, 0, 0, 0.23)',
          color: 'rgba(0, 0, 0, 0.87)',
          '&:hover': {
            color: '#4A90E2',
            backgroundColor: '#ffffff',
            border: '1px solid rgba(0, 0, 0, 0.23)',
            boxShadow: '#D0D0D0 4px 4px 0px 0px'
          }
        }
      }
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          color: 'black',
          backgroundColor: '#ffffff',
          fontSize: 12,
          lineHeight: '18px',
          border: '1px solid rgba(0, 0, 0, 0.23)',
          boxShadow: '#D0D0D0 4px 4px 0px 0px'
        }
      }
    },
    MuiAvatarGroup: {
      styleOverrides: {
        root: {
          flexDirection: 'row'
        }
      }
    }
  }
})

export default theme
