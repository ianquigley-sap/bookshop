const _env = /^--(sql|build-.*|cdsc-.*|odata-.*|folders-.*)$/
const _global = { flags: { '--new-csn':1 }, options: {}, }
const Severities = ['Error', 'Warning', 'Info', 'Debug']

module.exports.parseArgs = (cmd, args) => {

  const options = {}
  const argv = []
  const _flags = cmd.flags || []
  const _options = cmd.options || []
  const _shortcuts = cmd.shortcuts || []
  let env = null

  if (args.length>0)  for (let i = 0; i < args.length; ++i) {
    let a = args[i]
    if (!a.startsWith('-')) {
      argv.push(a)
      continue
    }
    let ox = _shortcuts.indexOf(a)
    if (ox >= 0) {
      if (ox >= _options.length) { options[_flags [ox - _options.length].slice(2)] = true; continue }
      else a = _options[ox]
    } else {
      ox = _flags.indexOf(a);
      if (ox >= 0) { options[_flags[ox].slice(2)] = true; continue }
    }
    ox = _options.indexOf(a)
    if (ox >= 0) {
      let optValue = true
      if (args[i+1])  optValue = args[++i]
      options[_options[ox].slice(2)] = optValue
      continue
    }
    if (a in _global.flags) {
      options[a] = true
      add2env (a,true)
      continue
    }
    if (a in _global.options || _env.test(a)) {
      const v = options[a] = args[++i]
      add2env (a,v)
      continue
    }
    throw new Error('invalid option: ' + a)
  }

  if (env) {
    const cds = require ('../../lib/cds')
    cds.env.add (env)
  }

  return { argv, options }

  function add2env(a,v) {
    if (a === '--new-csn')  {
      a = '--cdsc-newCsn'
      v = true
    }
    let o=env || (env={}), path = a.slice(2).split('-')
    while (path.length > 1) {
      let p = path.shift()
      o = o[p] || (o[p] = {})
    }
    return o[path.shift()] = v
  }
}

// sorts, filters, and writes compilation messages to console
module.exports.logMessages = (messages, logger=global.console) => {
  const { format } = require('./term')
  const level = _effectiveMessageLevel ()

  if (!Array.isArray (messages))  messages = [messages]
  messages.forEach (m => { if (!m.severity)  m.severity = 'Error' })

  messages = messages.filter (m => level.includes (m.severity))
  messages = _sortUnique (messages).map (m => {
    // show stack for resolution issues since there the requiring code location is in the stack
    const withStack = m.code === 'MODULE_NOT_FOUND'
    return format (m, m.severity, isInternalError(m), withStack)
  })

  if (logger)  messages.forEach (m => logger.error (m))
  return messages
}

function _sortUnique (a, comparator=_compareCompilationMessage) {
  let arr = [];
  for (let i = 0; i < a.length; i++) {
    const hasDup = arr.some(v => comparator(v, a[i]) === 0)
    if (!hasDup)  arr.push(a[i])
  }
  return arr.sort (comparator)
}

function _compareCompilationMessage (a, b) {
  let rc = Severities.indexOf (a.severity) - Severities.indexOf (b.severity);  if (rc !== 0)  return rc
  rc = eq( a.message, b.message );  if (rc !== 0)  return rc

  if (a.location && b.location) {
    let aend = a.location.end || a.location.start;
    let bend = b.location.end || b.location.start;
    return ( eq( a.location.filename, b.location.filename ) ||
             eq( a.location.start.line, b.location.start.line ) ||
             eq( a.location.start.column, b.location.start.column ) ||
             eq( aend.line, bend.line ) ||
             eq( aend.column, bend.column ))
  }
  else
    return (!a.location ? (!b.location ? 0 : 1) : -1)
  }

function eq(x, y) {
  return (x === y) ? 0 : (x > y) ? 1 : -1
}

function _effectiveMessageLevel () {
  const cds = require('../../lib/cds')
  const levelDefault = ['Error', 'Warning']  // suppress info and debug messages
  const { messageLevel } = cds.env.features // preliminary configuration, do not rely on it!
  if (!messageLevel)  return levelDefault

  if (/^debug$/i.test (messageLevel))  return ['Error', 'Warning', 'Info', 'Debug']
  else if (/^info$/i.test (messageLevel))  return ['Error', 'Warning', 'Info']
  else if (/^warn/i.test (messageLevel))  return ['Error', 'Warning']
  else if (/^error/i.test (messageLevel))  return ['Error']
  return levelDefault
}

function isInternalError(e) {
  // check for standard Error classes, but not Error itself
  return e.name === 'EvalError' || e.name === 'InternalError' || e.name === 'RangeError'
    || e.name === 'ReferenceError' || e.name === 'SyntaxError' || e.name === 'TypeError'
    || e.name === 'URIError'
}

/* eslint no-console:0 */