/**
 * Polyfill for node:util module
 */

export function format(format, ...args) {
  return String(format).replace(/%[sdifjoO%]/g, (match) => {
    if (match === '%%') return '%'
    return String(args.shift() || '')
  })
}

export function inspect(obj) {
  return JSON.stringify(obj)
}

export function promisify(fn) {
  return (...args) => Promise.resolve()
}

export function deprecate(fn, message) {
  return fn
}

export const types = {
  isDate: () => false,
  isRegExp: () => false,
}

export default {
  format,
  inspect,
  promisify,
  deprecate,
  types,
}
