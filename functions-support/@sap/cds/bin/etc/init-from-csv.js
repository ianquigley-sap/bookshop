const { path, isdir, isfile, readdir, readFile } = require ('../../lib/utils/fs')
const csvs = filename => filename[0] !== '-' && filename.endsWith ('.csv')
const csv = require ('../../lib/utils/csv')
const cds = require('../../lib/cds')

module.exports = function init_from_csv (model) {

  if (Array.isArray(model))  model = model[0]

  for (let each of [ model+'/csv', model+'/../csv', 'db/csv' ]) {
    let folder = path.resolve (each)
    // console.debug ('> checking', folder)
    if (isdir (folder)) {
      if (isfile (path.resolve(folder,'../init.js')))  continue //console.debug ('> shadowed by init.js')
      console.log (`> initializing from csv files at ${folder.replace(process.cwd(),'.')}...`)
      return cds.session.acquire() .then (dbc => dbc.begin()
        .then (()=>_init (folder,dbc))
        .then (()=> dbc.commit())
        .then (()=> cds.session.release (dbc))
      )
    }
  }

  function _init (folder, dbc) { return new Promise (_done => {
    let n=0; readdir (folder, (e,files) => _error(e) || files.filter(csvs).forEach (each => {
      ++n; readFile (path.join(folder,each), 'utf8', (e, src) =>{ _error(e)
        let [ cols, ...rows ] = csv.parse (src)
        let insert = INSERT.into (each.replace(/-/g,'.') .slice(0,-4)) /* global INSERT */
          .columns (cols) .rows (rows)
        dbc.run (insert) .then (()=> --n || _done())
      })
    }))
  })}

  function _error(e) {
    if (e)  throw e
  }
}

/* eslint no-console: off */