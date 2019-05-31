const debug = process.env.DEBUG

// https://docs.microsoft.com/en-us/windows/console/console-virtual-terminal-sequences
const t = {
  reset: '\x1b[0m', // Default
  bold: '\x1b[1m', // Bold/Bright
  link: '\x1b[4m', // underline
  red: '\x1b[91m', // Bright Foreground Red
  green: '\x1b[32m', // Foreground Green
  orange: '\x1b[38;2;255;140;0m' // darker orange, works with bright and dark background
}

const asErr = module.exports.error = o => debug ? o : as(t.red + t.bold, o)
const asWarn = module.exports.warn = o => debug ? o : as(t.orange + t.bold, o)
const asInfo = module.exports.info = o => debug ? o : as(t.green + t.bold, o)
module.exports.warn  = o => as(t.orange, o)
module.exports.info  = o => as(t.green, o)
Object.defineProperty(module.exports, 'colors', { get: () => process.stdin.isTTY && process.stdout.isTTY })

const format = module.exports.format = (o, severity='Error', asInternalError=false, withStack=false) => {
  switch (severity) {
    case 'Error'  : return format.error (o, asInternalError, withStack)
    case 'Warning': return format.warn (o)
    default       : return format.info (o)
  }
}

// decorate.error, .warning, .info
// 'Error: foo'  ->  '[ERROR] foo'  (Maven-like, allows for better grepping in logs)
Object.assign (format, {
  error: (o, asInternalError, withStack) => {
    if (debug)  return o
    if (asInternalError) {
      return `[${asErr('INTERNAL ERROR')}] ${o.stack || o.toString()}\nPlease report this error.\n`
    }
    return `[${asErr('ERROR')}] ${toString(o, 'Error', withStack)}`
  },
  warn: o => debug ? o : `[${asWarn('WARNING')}] ${toString(o, 'Warning')}`,
  info: o => debug ? o : `[${asInfo('INFO')}] ${toString(o, 'Info')}`,

  poorMarkdown: (md) => {  return md
    .replace(/\n# ([^\n]*)\n/g, `\n${as(t.bold, '$1')}\n`)
    .replace(/ \*([^*]+)\*/g,   ` ${as(t.bold, '$1')}`)
    .replace(/ _([^_]+)_/g,     ` ${as(t.link, '$1')}`)
  }
})

function as(codes, o) {
  return module.exports.colors ? (codes + o + t.reset) : ('' + o)
}

function toString(o, severity, withStack) {
  if (!o || !o.toString)  return o
  return (withStack && o.stack ? o.stack : o.toString())
      // strips the 'Error: ' prefix in the message, so that we can add our own prefix
      .replace(new RegExp('^' + severity + ': ', 'i'), '')  // beginning
      .replace(new RegExp(' ' + severity + ':' , 'i'), '')  // middle
}
