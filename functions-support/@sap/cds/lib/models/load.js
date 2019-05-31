module.exports = Object.assign (load, {only:get})
const cdsv = require('./cdsv')
const path = require('path')

function load (model, options) {
  let all
  if(options && options._isObject) {      //TODO: Workaround for collectedSources in mtx case, can be removed with switch to one-csn
    all = model
  } else {
    all = this.resolve (model); if (!all) return notFound (model)
  }

  const m = _loadCollectedSources (all, options); if (m)  return m // REVISIT: remove that
  return cdsv.compile (all, undefined, options)
}

function get (model) {
  const all = this.resolve(model); if (!all) return notFound (model)
  if (all.length > 1) throw new Error(`You can only cds.get a single model`)
  return cdsv.compile (all, undefined, {parseOnly: true})
}

// TODO: wir müssen das loswerden
function _loadCollectedSources (file, options) {
  let collectedSources
  if(options && options._isObject) {
    collectedSources = file
    delete options._isObject
  } else {
    if(Array.isArray(file)) {
        if(file.length === 1) {
          [file] = file
        } else {
          const found = file.find(elem => typeof elem === 'string' && path.parse(elem).base === 'csn.json')
          if(found) {
            throw new Error('Not supported')
          }
        }
    }

    if (typeof file !== 'string' || path.parse(file).base !== 'csn.json') return
    collectedSources = require(path.resolve(file))
  }

  const parsed = cdsv.parse (collectedSources, options)
  let srv = collectedSources.srv
  if (srv) {
    if (!srv.endsWith(path.sep))  srv += path.sep
    for (let each in parsed.definitions) {
      let d = parsed.definitions[each], src = d['@source']
      if (src)  d['@source'] = src.replace(srv,'')
    }
  }
  parsed._sources.splice(0, parsed._sources.length, file)
  return Promise.resolve(parsed)
}

function notFound (model) {
  return Promise.reject(Object.assign(new Error(`Couldn't find a CDS model at: ${_local(model)}`), {
    code: 'MODEL_NOT_FOUND', model
  }))
}

const _cwd = process.cwd() + require('path').sep
const _local = (path) => ('' + path).replace(_cwd, '')
