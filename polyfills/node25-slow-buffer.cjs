// Polyfill for SlowBuffer removed in Node 25.
// Required by buffer-equal-constant-time (transitive dep of jsonwebtoken via jwa).
// Safe to load on older Node versions -- only patches if SlowBuffer is missing.

'use strict'

const buffer_module = require('buffer')

if (!buffer_module.SlowBuffer) {
  buffer_module.SlowBuffer = class SlowBuffer extends buffer_module.Buffer {}
}
