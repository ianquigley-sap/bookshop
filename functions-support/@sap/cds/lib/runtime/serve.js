/*USAGE:*/()=>{
  const app = require('express')()
  cds.serve('all').in(app)  //> no subsequent .at() or .with() possible
  cds.serve('CatalogService').from('all').in(app).at('/mount-point').with(function(){
    const { Books } = this.entities
    this.on('READ', Books, (req) => req.reply([]))
  })
}

module.exports = cds_serve
const cds = require('../cds')
const service = require ('./service')
const isIdentifier = (x) => typeof x === 'string' && /^[A-Za-z_$][\w$]*$/.test (x)
const cache = cds_serve.cache = {}

const ProtocolAdapter = {for:(srv, to='odata_v4') => {
  if (srv._adapters) {
    const a = srv._adapters[to];  if (a) return a
  } else {
    Object.defineProperty (srv,'_adapters', {value:{}})
  }
  const adapter4 = service.adapter.for[to]
  if (adapter4)  return srv._adapters[to] = adapter4(srv)
  else throw new Error (`service protocol ${to} is not supported`)
}}

/**
 * Load given model(s) and construct providers for all defined services.
 */
function cds_serve (service_or_model, givenOptions={}) { // NOSONAR
  const options = Object.assign({}, givenOptions)

  if (!isIdentifier(service_or_model)) {
    return cds_serve('all',options).from(service_or_model)
  }

  const cds = this.serve === cds_serve ? this : global.cds
  const providers=[] //> filled in _constructProviders
  const ready = Promise.resolve().then (_loadModel) .then (_constructProviders)
  const fluent = _fluent (options)
  return fluent

  /**
   * Fluent API used to fill in options subsequently
   */
  function _fluent (o=options) {
    return {
      from (model) { o.service = service_or_model; o.model = model; return this },
      to (protocol) { if (protocol) { o.to = protocol }  return this },
      at (path) { if (path) { o.at = path }  return this },
      with (impl) { if (impl) { o.with = impl }  return this },
      in (app) { ready.then (()=>_addProviders2(app)); return this },
      then (r,e) { return ready.then (()=> r(_returnProviders()), e) },
      catch (e) { return ready.catch(e) },
    }
  }

  /**
   * Load the given model if it's not already a parsed csn passed in
   */
  function _loadModel(){
    let model = options.model
    if (typeof model === 'object' && !Array.isArray(model)) return model //> already a csn
    if (!model) {
      if (options.service)  model = service_or_model //> compat to cds.serve('all',{service})
      else { options.service = service_or_model;  model = 'all' }
    }
    if (model === 'all' || model[0] === 'all') {
      model = [ cds.env.folders.app, cds.env.folders.srv, 'services', '.' ].find (m => cds.resolve(m))
      if (!model)  throw new Error (`[cds] - \n
        No service models found in current working directory.
        Make sure you call cds.serve in the root of your project.
      `)
    }
    const key = Array.isArray(model) ? model.join(';') : model
    const cached = cache[key]
    if (cached) return cached
    else  return cache[key] = cds.load (model)
  }

  /**
   * Construct providers for all services defined in the loaded model.
   */
  function _constructProviders (csn, n=0) {

    const o=options, external = cds.env.requires
    const chosen = o.service && o.service !== 'all' ? def => def.name.endsWith (o.service) : ()=>true
    o.passport = o.passport || (cds.env.auth && cds.env.auth.passport)

    // prepare and register all services
    cds.reflect(csn) .foreach (service, def => {
      const name = def.name
      if (def['@cds.ignore']  ||  !chosen(def)  ||  external[name])  return
      if ((o.at || o.with) && ++n > 1) throw new Error('You cannot specify `path` or `impl` for multiple services')
      const serviceOptions = {...o, at: service.path4 (def, o.at) }
      const provider = service.for (csn, {service: name, __proto__: serviceOptions})
      provider.path = serviceOptions.at
      provider.impl = service.impl4 (def, o.with)
      providers.push (provider)
      // cds.services [name] = provider
      //> only possible when ServiceProvider == ServiceClient
      Object.defineProperty (cds.services, name, { configurable:1,
        set:(s)=> Object.defineProperty (cds.services, name, {value:s, writable:1}),
        get:()=> cds.services[name] = service.client.for (name),
      })
    })

    // invoke all service impl functions --> in a pass 2 to allow them connect to local services
    _addImpls()
    return providers
  }

  /**
   * Add constructed providers to express app
   */
  function _addProviders2 (app) {
    for (let each of providers) {
      // audit logger to be provided here, current workaround: take it from service
      service.performanceMeasurement(app)
      service.passport(each, app, each._auditLogger, options)
      // add use method to services for backward compatibility
      each.use = app.use
      app.use (each.path+'/webapp/*', (_,res)=> res.status(400).send()) // REVISIT: this is to avoid ugly warnings by Fiori requests --> should go into Fiori protocol adapter
      app.use (each.path, ProtocolAdapter.for (each, options.to))
      cds.emit ('serve', each)
    }
    cds.emit ('served', providers[0].model)
  }

  /**
   * Invoke all provided service implementation functions or classes
   */
  function _addImpls () {
    for (let each of providers) {
      let impl = each.impl
      if (typeof impl === 'object')  impl = each.impl = impl [each.name]
      if (typeof impl !== 'function')  continue;
      if (/^class\s/.test(Function.prototype.toString.call(impl))) {
        const clazz = impl;  impl = each.impl = (srv)=>{ // NOSONAR
          const inst = new clazz (srv)
          for (let e of Reflect.ownKeys (clazz.prototype)) {
            if (e in {constructor:1, prototype:1})  continue
            srv.on (e, (...args) => inst[e](...args))
          }
        }
      }
      each.with (impl)
      // each.impl (each)
    }
  }

  /**
   * Returns a single picked provider or a map of all constructed providers
   */
  function _returnProviders() {
    let all={}, fn='none'
    for (let each of providers) {
      const handler = ProtocolAdapter.for (each, options.to)
      fn = all[each.name] = (...args) => handler(...args)
      // returned objects are handlers + instances to support code like this:
      // const { CatalogService } = cds.serve(...)
      // app.use ('/cats', CatalogService)
      Object.setPrototypeOf (fn, each)
      Object.defineProperty (fn, 'name', {value:each.name})
    }
    if (providers.length === 1 && fn.name === options.service) { // NOSONAR
      if (!(fn.name in fn))  Object.assign (fn,all)  // NOSONAR
      return fn
    }
    else return all
  }
}
