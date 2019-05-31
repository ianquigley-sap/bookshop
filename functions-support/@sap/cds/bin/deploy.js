module.exports = Object.assign(deploy, {
  options: ['--to'], flags: ['--no-save'],
  shortcuts: ['-2'],
  help: `
# SYNOPSIS

    *cds deploy* [ <model> ] [ --to <database> ]

    Deploys the given model to a database. If no model is given it looks up
    according configuration from _package.json_ or _.cdsrc.json_ in key
    _cds.requires.db_.  Same for the database.

`})

const cds = require('../lib/cds')

function deploy ([model], { to:url, 'no-save':no_save = cds.env.deploy.no_save }) {

  const db = cds.connect(url)
  if (!model)  model = db.options && db.options.model
    || cds.env.requires.db && cds.env.requires.db.model
    || ['db','srv']

  db.then(()=> db.load(model) .then (csn=> db.deploy (csn))
  .then (() => require ('./etc/init-from-csv') (model))
  .then (() => cds.disconnect()))
  .then (url && !no_save && (() => registerDatasource(db,model)))
  .catch (e => {
    if (!model && e.code === 'MODEL_NOT_FOUND') {
      throw new Error('Please specify a data model or configure one in package.json#cds.requires.db.model')
    } else throw e
  })

}


function registerDatasource ({options}, model) { try {
  const package_json = require('path') .resolve ('package.json')
  const pj = require (package_json)
  if (pj.cds && pj.requires && pj.requires.db)  return
  const conf = (pj.cds || (pj.cds={})) .requires || (pj.cds.requires = {})
  cds.env.requires.db = conf.db = {
    kind: options.kind,
    model: model,
    credentials: options.credentials,
  }
  const write = require('util').promisify (require('fs').writeFile)
  write (package_json, JSON.stringify(pj,null,'  ')).then (()=>
    console.log (' - updated package.json')
  )
} catch(e){/* ignore */}}

/* eslint no-console: off */