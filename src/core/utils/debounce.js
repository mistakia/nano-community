export const debounce = (callback, wait) => {
  let timeout = null
  return (...args) => {
    // eslint-disable-next-line
    const next = () => callback(...args)
    clearTimeout(timeout)
    timeout = setTimeout(next, wait)
  }
}
