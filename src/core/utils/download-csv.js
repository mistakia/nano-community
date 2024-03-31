/* global Blob */

function convert_to_csv(objArray) {
  const array = typeof objArray !== 'object' ? JSON.parse(objArray) : objArray
  let str = ''

  for (let i = 0; i < array.length; i++) {
    let line = ''
    for (const index in array[i]) {
      if (line !== '') line += ','
      line += array[i][index]
    }
    str += line + '\r\n'
  }
  return str
}

export function download_csv({
  headers,
  data,
  file_name = 'nano-community-download'
}) {
  const date = new Date()
  const timestamp = date.toISOString().replace(/:/g, '-').replace(/\..+/, '')
  file_name = `${file_name}-${timestamp}.csv`
  if (headers) {
    data.unshift(headers)
  }

  // Convert Object to JSON
  const json_object = JSON.stringify(data)
  const csv = convert_to_csv(json_object)
  const blob = new Blob([csv], { type: 'text/csvcharset=utf-8' })
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
