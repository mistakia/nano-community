/* global localStorage */

const LOCAL_STORAGE_PREFIX = '/nano.community/'

export const localStorageAdapter = {
  getItem(key) {
    // return promise to match AsyncStorage usage on mobile
    return new Promise((resolve, reject) => {
      try {
        const d = JSON.parse(
          localStorage.getItem(`${LOCAL_STORAGE_PREFIX}${key}`)
        )
        resolve(d)
      } catch (e) {
        reject(e)
      }
    })
  },

  removeItem(key) {
    localStorage.removeItem(`${LOCAL_STORAGE_PREFIX}${key}`)
  },

  setItem(key, value) {
    localStorage.setItem(`${LOCAL_STORAGE_PREFIX}${key}`, JSON.stringify(value))
  }
}
