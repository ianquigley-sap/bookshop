module.exports = Object.assign (repl, { options: [], help: `
# SYNOPSIS

    *cds r | repl*

    Launches into a read-eval-print-loop, an interactive playground to
    experiment with cds's JavaScript APIs. See documentation of Node.js'
    REPL for details at _http://nodejs.org/api/repl.html_


`})

const cds = require('../lib/cds')
const path = require('path')
const fs = require('fs')
const {inspect} = require('util')

function repl (_, options={}) {

  const log = options.log || console.log
  const colors = options.colors !== false
  const info = colors ? require('./utils/term').info : s => s

  log(info('Welcome to CDS REPL'))
  const repl = require('repl') .start (Object.assign(options, { writer:print }))
  const {stdout} = process

  function print (o) {

    if (o == null || typeof o === 'string')  return o
    if (o._isQuery) for (let x in o) {
      const v = o[x];  if (typeof v === 'function')  continue
      return inspect ({[x]:v}, {colors, depth: 22})
      .replace (/^\w*\s/,'')
      .replace(/{ ref: \[([^\]]*)\] }/g, (_,ref) => '{ref:['+ref.slice(1,-1)+']}')
      .replace(/{ val: ([^ ]*) }/g, '{val:$1}')
      .replace(/{ (xpr|ref|val): /g, '{$1:')
    }

    if (o.then) {
      o.then (r => { if (r) {
        log ('\b\b⇢ '+print(r)); stdout.write('\n> ')
      }})
      return ''
    }

    // for others install cds inspect
    // REVISIT: wow, das ist aber recht teuer!
    return inspect(require('./utils/format').install(o), {colors, depth: 11})
      .replace(/{ ref: \[([^\]]*)\] }/g, (_,ref) => '{ref:['+ref.slice(1,-1)+']}')
      .replace(/{ val: ([^ ]*) }/g, '{val:$1}')
      .replace(/{ (xpr|ref|val): /g, '{$1:')
  }

  repl.context.cds = cds

  const history = path.join(process.env.HOME || process.env.USERPROFILE, '.cds_repl_history')
  const historySize = 111
  fs.readFile(history, 'utf-8', (e, txt) => e || (repl.history = txt.split('\n')))
  repl.on('exit', () => {
    if (repl.history)  fs.writeFile(history, repl.history.slice(-historySize).join('\n'), () => {})
    log(info('bye'))
  })

}

process.on('uncaughtException', console.error)
process.on('unhandledRejection', console.error)

/* eslint no-console:0 */
