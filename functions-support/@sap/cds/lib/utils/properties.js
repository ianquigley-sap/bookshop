const fs = require('fs')

const Properties = module.exports = { read, parse }

function read (res, ext = '.properties') {
  try {
    // Although properties are actually latin1-encoded, people tend to have
    // unicode chars in them (e.g.German umlauts), so let's parse in utf-8.
    const properties = Properties.parse (fs.readFileSync(res+ext, 'utf-8'))
    return Object.defineProperty (properties, '_source', {value:res+ext})
  } catch (e) {
    if (e.code !== 'ENOENT') throw new Error (`Corrupt ${ext} file: ${res+ext}`)
  }
}

function parse (props) {
  const lines = props.split(/\r?\n/)
  const rows = lines.filter(each => !!each.trim()).map(each => each.split(/\s*=\s*/))
  const bundle = rows.reduce((all, [key, value]) => {
    if (!/^\s*#/.test(key)) all[key] = stringFor(value)
    return all
  }, {})
  return bundle
}

function stringFor(raw) {
  return raw.replace(/\\u[\dA-F]{4}/gi, (match) => String.fromCharCode(parseInt(match.replace(/\\u/g, ''), 16)))
}
