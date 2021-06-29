// https://github.com/bevacqua/fuzzysearch
export const fuzzySearch = (needle, haystack) => {
  needle = needle.toLowerCase()
  haystack = haystack.toLowerCase()
  const hlen = haystack.length
  const nlen = needle.length
  if (nlen > hlen) {
    return false
  }

  if (nlen === hlen) {
    return needle === haystack
  }
  // eslint-disable-next-line
  outer: for (let i = 0, j = 0; i < nlen; i++) {
    const nch = needle.charCodeAt(i)
    while (j < hlen) {
      if (haystack.charCodeAt(j++) === nch) {
        // eslint-disable-next-line
        continue outer
      }
    }
    return false
  }
  return true
}
