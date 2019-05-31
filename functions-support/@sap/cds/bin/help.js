module.exports = Object.assign (help, {help:`
# USAGE

    *cds* <command> [<args>]
    *cds* <src> == *cds compile* <src>

# COMMANDS

  *c* | *compile*    ...individual models (= the default)
  *d* | *deploy*     ...data models to a database
  *s* | *serve*      ...service models to REST clients
  *b* | *build*      ...whole modules or projects
  *i* | *init*       ...jump-starts a new project
  *e* | *env*        get/set current cds configuration
  *r* | *repl*       cds's read-eval-event-loop
  *h* | *help*       shows usage for cds and individual commands
  *v* | *version*    prints detailed version information

  *cds help* <command> gives help about each
`})

function help ([topic]=[]) {
  const { format } = require('./utils/term')
  try {
    let txt = !topic ? help.help : require('./' + topic).help
    if (txt)  return console.log (format.poorMarkdown (txt))
  } catch (e) {
    if (e.code !== 'MODULE_NOT_FOUND')  throw e
  }
  throw new Error(`Didn't find a help topic for ${topic}.`)
}


/* eslint no-console: off */
if (!module.parent)  help (['init'])