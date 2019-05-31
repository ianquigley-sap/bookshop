const PROFILE = '['+( process.env.CDS_ENV || process.env.NODE_ENV || '-- none --' )+']'
const defaults = require.resolve ('./defaults'), DEFAULTS = require(defaults)
const home = require('os').homedir()
const path = require('path')
const fs = require('../fs')
const cache = {}
const compat = require('./compat')
const _cwd = process.cwd()

/**
 * Both a config inctance as well as factory for.
 */
const Config = [ class {

  constructor (prefix='cds') {
    Object.defineProperty (this, '_sources', {value:[]})
    if (prefix === 'cds')  compat (this)
    if (prefix === 'cds')  this.add (DEFAULTS, defaults)
  }

  /** @returns {Config} */
  in (cwd) { return this.for ('cds', cwd) }

  /** @returns {Config} */
  for (prefix, cwd=_cwd, force=false) {
    const cached = cache[cwd] || (cache[cwd] = {})
    if (force || !cached[prefix]) {
      const config = cached[prefix] = new Config (prefix)

      // 1. read default env vars early, as they might influence active profiles
      _envFromFile(config, cwd, 'default-env.json')

      // 2. read config sources in defined order, w/o resolving profiles
      config
        .load (prefix === 'cds' && home, '.cdsrc.json', false)
        .load (prefix === 'cds' && cwd, '.cdsrc.json', false)
        .load (cwd, 'package.json', false, p => p[prefix])
        .add (_env(prefix), 'process.env')

      // 3. resolve profiles after config is complete
      config.merge()

      // 4. complete required services with vcap
      _vcap_services (config, prefix)
    }
    return cached[prefix]
  }

  load (cwd, res, _resolveProfiles=true, _conf=o=>o) {
    if (!cwd)  return this
    res = path.join(cwd, res)
    const conf  = _conf(_jsonFromFile(res)) // only support JSON
    if (conf) {
      this._sources.push (res)
      return _merge (this, _resolveProfiles, conf)
    }
    return this
  }

  add (conf, /*from:*/ _src) {
    if (!conf)  return this
    if (_src)  this._sources.push (_src)
    return this.merge (this, conf)
  }

  merge (dst=this, src=this) { // NOSONAR
    return _merge(dst, true, src)
  }

  get (path='') {
    return path.split('.').reduce ((p,n)=> p && p[n], this)
  }

  get defaults() { return DEFAULTS }
  get profile() { return PROFILE.slice(1,-1) }

  // for tests only!
  _for (...conf) {
    const env = new Config
    this._for.vcaps = (vcaps) => { _vcap_services4 (env, 'cds', vcaps)}
    // merge all configs, then resolve profiles (same as in 'for' function above)
    for (let c of conf)  _merge(env, false, c)
    return env.merge()
  }

} ][0] //> to make this a nameless class

function _merge (dst, resolveProfiles, ...src) { // NOSONAR
  for (let o of src) {
    for (let p in o) {
      const v = o[p]
      if (resolveProfiles && p[0] === '[') {
        if (p === PROFILE)  _merge (dst, true, v)
        delete dst[p]
      }
      else if (typeof v === 'object' && !Array.isArray(v)) {
        if (!dst[p])  dst[p] = {}
        _merge (dst[p], resolveProfiles, v)
      }
      else dst[p] = v
    }
  }
  return dst
}

function _env (prefix) {
  const PREF_=prefix.toUpperCase()+'_'
  const env = process.env, all = JSON.parse (env[PREF_+'CONFIG'] || '{}')
  for (let p in env) if (p.startsWith(PREF_) && p !== PREF_+'ENV' && p !== PREF_+'CONFIG') {
    let o=all, path = p.slice(PREF_.length).toLowerCase().split('_')
    while (path.length > 1) {
      let p = path.shift()
      if (!o[p])  o[p] = {}
      o = o[p]
    }
    o[path.shift()] = env[p]
  }
  return all
}

function _vcap_services (env, prefix) {
  if (env.features && env.features.vcaps === false)  return
  if (!env.requires)  return

  const { VCAP_SERVICES } = process.env;  if (!VCAP_SERVICES)  return
  try { var vcaps = JSON.parse (VCAP_SERVICES) } catch(e) {
    throw new Error ('[cds.env] - failed to parse VCAP_SERVICES:\n  '+ e.message)
  }
  if (_vcap_services4 (env, prefix, vcaps))  env._sources.push ('vcap_services')
  return env
}

function _vcap_services4 (env, prefix, vcaps={}) { //NOSONAR
  let any
  for (let datasource in env.requires) {
    const each = env.requires [datasource]
    const { credentials } = ( //NOSONAR
      _fetch (each.vcap) ||  //> alternatives, e.g. { name:'foo', tag:'foo' }
      _fetch ({ name: datasource })  ||
      _fetch ({ tag: prefix+':'+datasource }) ||
      _fetch ({ tag: each.kind }) || // important for hanatrial, labeled 'hanatrial', tagged 'hana'
      _fetch ({ label: each.kind }) ||
      {/* not found */}
    )
    if (credentials)  any = each.credentials = credentials
  }
  return any

  function _fetch (condition) { //NOSONAR
    let cond;  for (let key in condition) {
      const val=condition[key], prev=cond, next=(
        key === 'tag' ? e => _array(e, 'tags').includes (val)
        : e => e[key] === val
      )
      cond = prev ? e => prev(e) || next(e) : next
    }
    if (cond) for (let stype in vcaps) {
      const found = _array(vcaps, stype).find (cond)
      if (found)  return found
    }
  }

  function _array(o, p) {
    if (!o[p])  return []
    if (Array.isArray(o[p]))  return o[p]
    throw new Error(`Expected '${p}' to be an array, but was: ${require('util').inspect(vcaps)}`)
  }

}

function _envFromFile (env, cwd, fileName) {
  const file = path.join(cwd, fileName)
  const json = _jsonFromFile(file)
  let val
  for (const key in json) {
    if (key in process.env)  continue // do not change existing env vars
    val = json[key]
    // env vars hold only strings
    if (typeof val === 'object') {
      process.env[key] = JSON.stringify(val)
    } else {
      process.env[key] = val + ''
    }
  }
  if (val)  env._sources.push(file)
  return env
}

function _jsonFromFile (file) {
  try {
    const src = fs.readFileSync (require.resolve (file))
    return JSON.parse (src)
  } catch (e) {
    if (e instanceof SyntaxError)  console.error(`Error parsing '${file}': ${e.message}`)
    else if (e.code !== 'MODULE_NOT_FOUND')  console.error(e.message)
  }
  return {}
}

module.exports = (new Config).in (_cwd)

/* eslint no-console:0 */
