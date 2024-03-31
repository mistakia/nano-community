export function download_json({ data, file_name = 'nano-community-download' }) {
  const date = new Date()
  const timestamp = date.toISOString().replace(/:/g, '-').replace(/\..+/, '')
  file_name = `${file_name}-${timestamp}.json`
  const json_str = JSON.stringify(data)
  const blob = new Blob([json_str], { type: 'application/json' })
  if (navigator.msSaveBlob) {
    // IE 10+
    navigator.msSaveBlob(blob, file_name)
  } else {
    const link = document.createElement('a')
    if (link.download !== undefined) {
      // feature detection
      // Browsers that support HTML5 download attribute
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', file_name)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }
}
