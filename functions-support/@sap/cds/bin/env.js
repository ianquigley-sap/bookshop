module.exports = Object.assign(config, {
  options: ['--for'], flags: [], shortcuts: ['-4'],
  help: `
# SYNOPSIS

    *cds env*
    *cds env* <ls | list> [<key>]
    *cds env* set <key> <value>
    *cds env* get <key>
    *cds env* src

# EXPLANATION

    Without any arguments, this will display the effective configuration in
    the current envorinment in JavaScript object format. <ls | list> displays
    it in .properties format.

    The other variants either get or set a single option or display the sources
    from which the effective config has been loaded.

`})

const {inspect} = require('util')
const {info,colors} = require('./utils/term')

function config ([cmd, key, value], options={}) {
  const cds = require('../lib/cds')
  const fn = commands[cmd] || (()=>{
    require('../bin/help')(['env'])
    throw new Error (`Don't understand '${cmd}' here...`)
  })
  // REVISIT API-intrusive logger option
  const {for:target='cds'} = options
  options.console = options.logger || console
  fn (cds.env.for(target), key, value, options)
}

const commands = {

  get [undefined]() { return commands.list },
  get ls() { return commands.list },
  get get() { return commands.json },

  list (conf, _key, val, {console}) { // NOSONAR
    (function _list (o = _key ? conf.get(_key) : conf, key = _key || '') {  // NOSONAR, ...tzefix!!
      if (o && typeof o === 'object' && !Array.isArray(o)) for (let p of Object.keys(o).sort()) {
        const d = Reflect.getOwnPropertyDescriptor (o,p)
        if (!d.value && !d.get)  continue
        if (o[p])  _list (o[p], (key ? key+'.' : '')+p)
      } else  console.log (info(key), '=',o)
    })()
  },

  src (conf, key, val, {console}) {
    console.log()
    for (let each of [...conf._sources].reverse())  console.log (' ', each)
    console.log()
  },

  json (conf, key, val, {console}) {
    console.log (inspect (key ? conf.get(key) : conf, {depth:22,colors}))
  },

  set () {
    throw new Error ('cds config set is not yet implemented, sorry')
  },

}

/* eslint no-console:0 */
