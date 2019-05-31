const cds = require('../cds')
const ql = require('./ql')

module.exports = cds_connect
cds_connect.to = cds_connect_to
const configured = cds.env.requires
const cached = cds.services


/**
 * Establishes a primary connection --> cds serves as shortcut
 * @param {string|{kind:string,credentials:{}}} options
 */
function cds_connect (options) {try{
  if (cds.session && !options || options === false)  return cds
  else if (typeof options === 'string')  _connect_to (options, undefined, true)
  else if (options)  _connect_to (undefined, options, true)
  else _connect_to ('db', undefined, true)
  return cds
} catch(e) { return _reject(e) }}


/**
 * Establishes connections to specific datasources
 * @param {string} [datasource]
 * @param {kind:string,credentials:{}} options
 */
function cds_connect_to (datasource, options) {try{
  return _connect_to (datasource, options)
} catch(e) { return _reject(e) }}


function _connect_to (datasource, options, _as_primary) {

  // canonicalize optional arguments
  if (typeof datasource === 'object')  [ datasource, options ] = [ null, datasource ]

  // first of all check cached connections
  const former = _cached (datasource, options)
  if (former)  return former

  // prepare options
  const [ds,o,primary] = _options4 (datasource, options, _as_primary)

  // potentially connect to local services
  const local = _connectLocal (ds,o)
  if (local)  return local

  // create a new connection
  const client = ql.connect (ds||'',o, primary)
  if (datasource)  cached [datasource] = client
  if (primary)  _primary (client)

  return _new (client, datasource)

}


function _options4 (datasource, options, primary) { // NOSONAR
  const o = options || {}

  if (o.primary || datasource === 'db')  primary = true
  if (primary && cds.session)  _error (`you need to disconnect before creating a new primary connection`)

  // turn datasources à la kind:uri into options={ kind, uri }
  const [, kind, uri ] = /^(\w+):(.*)/.exec(datasource) || []
  if (kind) return [ undefined, Object.assign ({ kind, uri, credentials:{
    [ kind === 'sqlite' ? 'database' : 'url' ]: uri
  }}, options), primary ]

  // check validity of effective options --> give reasonable error messages
  if (datasource) {
    if (!o.kind && !o.driver) {
      const conf = configured [datasource]
      if (!conf)  _error (`didn't find a configuration for 'cds.requires.${datasource}'`)
      if (!conf.kind && !conf.driver)  _error (`configuration for 'cds.requires.${datasource}' lacks mandatory property 'kind'`)
    }
  } else if (options) {
    if (!o.kind && !o.driver)  _error (`provided options object lacks mandatory property 'kind'`)
  }
  return [ datasource, options, primary ]
}


function _cached (datasource, options) {
  const cc = cached [datasource]
  if (cc && options)  _error (`attempt to reconnect to '${datasource}' with new options`)
  return cc
}

function _connectLocal (datasource, options={}) {
  if (options.kind === 'local') {
    return cds.services [options.uri] || _error (`didn't find a local service named '${options.uri}'`)
  }
}

function _primary (ds) {
  cds.session = ds
  Object.defineProperties (cds, {
    options: {configurable: true, value: ds.options},
    then: {configurable: true, value: (r,e) => {
      if (ds.then)  return ds.then (()=>r(cds),e)
      delete cds.then; process.nextTick (()=>r(cds),e)
    }},
    catch: {configurable: true, value: (...a) => ds.catch(...a)},
    model: {configurable: true, get:() => ds.model },
    entities: {configurable: true, get:() => ds.model.entities},
  })
  for (let p of [ 'transaction', 'run', 'stream', 'foreach', 'read', 'insert', 'update', 'delete', 'acquire', 'release', 'disconnect', 'deploy' ]) {
    Object.defineProperty (cds, p, {configurable: true, value: (...a) => ds[p](...a)})
  }
}

function _new (client, datasource) {
  if (!client.name)  client.name = datasource
  // ensure we remove clients from caches upon disconnect
  if (client.disconnect) {
    const _disconnect = client.disconnect
    client.disconnect = ()=>{
      if (client === cds.session)  cds.session = undefined
      delete cached [datasource]
      return _disconnect.call (client)
    }
  }
  cds.emit ('connect', client)
  return client
}

function _error (msg) {
  throw new Error ('[cds.connect] - '+ msg)
}
function _reject (err) {
  throw err
  // const rejected = Promise.reject(err)
  // return   Object.defineProperties (rejected, {
  //   transaction: {configurable: true, value: ()=>rejected},
  //   acquire: {configurable: true, value: ()=>rejected},
  //   deploy: {configurable: true, value: ()=>rejected},
  //   entities: {configurable: true, value: ()=>rejected},
  //   foreach: {configurable: true, value: ()=>rejected},
  //   release: {configurable: true, value: ()=>rejected},
  //   run: {configurable: true, value: ()=>rejected},
  //   disconnect: {configurable: true, value: ()=>rejected},
  // })
}
