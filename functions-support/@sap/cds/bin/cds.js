#!/usr/bin/env node
module.exports = main

const Shortcuts = {
  b: 'build',
  c: 'compile',
  d: 'deploy',
  s: 'serve',
  e: 'env',
  r: 'repl',
  i: 'init',
  h: 'help',
  v: 'version',
  '-v': 'version',
  '--version': 'version',
  '--help': 'help',
  '-?': 'help',
  '-e': 'eval'
}


// --- bootstrap: try to find a locally installed cds, otherwise launch this one
if (!module.parent && !global.__cds_bin) { //> this is the root loaded
  global.__cds_bin = __dirname  // capture the initial script for debugging (see version.js)
  const require_local = require('../lib/utils/require-local')
  const _main = require_local ('@sap/cds/bin/cds', {else:main})
  _main()  //> run the main function
}

function main (cmd = process.argv[2], ...args) {

  if (cmd in Shortcuts)  cmd = Shortcuts[cmd]
  if (args.length === 0)  args = process.argv.slice(3)
  if (cmd !== 'repl')  _errorHandling ()

  // help
  if ((!cmd && process.stdin.isTTY)) { // 'cds'
    return require('./help')()
  } else if (args.find(a => Shortcuts[a] === 'help'))  { // 'cds foo --help/-?'
    return require('./help')([cmd])
  }

  try {
    // one of our built-in cli commands?
    if (require.resolve('./' + cmd))  cmd = './' + cmd
  } catch (err) {
    if (cmd)  args.unshift(cmd)
    cmd = './compile'
  }
  cmd = require (cmd)

  // parse arguments and options for specific command
  const {argv, options} = require('./utils/cli').parseArgs(cmd, args)

  // finally run the command
  const result = cmd (argv, options)
  if (result && result.then) { // handle promise results
    result.then(res => { if (parseInt(res)) process.exitCode = res })// interpret returned int as exit code
  }
}


function _errorHandling () {
  const { logMessages } = require ('./utils/cli')
  const errorHandler = process.env.DEBUG
    ? err => { console.error(err); process.exit(1) }
    : err => { logMessages (err.errors || err);  process.exit(1) }
  process.on('uncaughtException', errorHandler)
  process.on('unhandledRejection', errorHandler)

  let messages = []
  require('../lib/cds').on ('compilationMessage', (m) => messages.push (m))
  process.on('beforeExit', () => logMessages (messages))
}


/* eslint no-console:0 */