'use strict'

class InvalidUrlError extends Error {
  constructor(message = 'Invalid Url') {
    super(message)
    this.name = 'InvalidUrlError'
    this.code = InvalidUrlError.code
  }
}

InvalidUrlError.code = 'ERR_INVALID_URL'
exports.InvalidUrlError = InvalidUrlError

class UnknownUrlError extends Error {
  constructor(message = 'Unkown Url') {
    super(message)
    this.name = 'UnknownUrlError'
    this.code = UnknownUrlError.code
  }
}

UnknownUrlError.code = 'ERR_UNKNOWN_URL'
exports.InvalidUrlError = UnknownUrlError
