const cds = require ('../cds')
const fs = require ('../utils/fs')
const lib = require('@sap/cds-services'); lib.inject(cds)

/**
 * Decorate cds.service
 */
Object.setPrototypeOf (module.exports, cds.builtin.classes.service)
exports.impl = fn=>fn       //> dummy to assist vscode IntelliSense
exports.client = { for: lib.for }             //> to get a service client
exports.provider = { for: lib.service }  //> to get a service provider
exports.adapter = { for: lib.to }          //> to get a service adaptor
exports.adapter.for.odata = lib.to.odata_v4
exports.adapter.for.fiori = lib.to.odata_v4
exports.for = lib.service       //> shortcut for cds.service.provider.for
exports.providers = []
exports.passport = lib.passport
exports.performanceMeasurement = lib.performanceMeasurement

if (cds.env.features.localized && cds.options && cds.options.kind === 'sqlite') {
    const _for = exports.for
    const {serve} = require('../alpha/_localized')
    exports.for = (...args) => serve (_for (...args))
}



const {dirname,parse,resolve} = require('path')
const {isdir} = cds.utils

/**
 * Resolve a service implementation function as follows...
 * 1. if _impl is a function --> got it
 * 2. if _impl is a string --> `require (it)` (using model source if available)
 * 3. if def is annotated with @impl --> `require (def[@impl])`
 * 4. if we got the model's source --> `require (<basename>.js)`
 */
exports.impl4 = function (def, _impl = def['@impl']) {
    const _source = def['@source'] || def._location && def._location.filename
    const dir = _source && isdir(dirname(_source)) ? dirname(_source) : process.cwd()

    if (typeof _impl === 'function')  return found (_impl)
    if (_impl)  return load (_impl, true)
    if (_source) {
        const impl = parse(_source).name + '.js'
        return load(impl) || load('js/'+impl) || load('handlers/'+impl)
    }

    function found (impl, _source = impl.name || '<inline>') {
        return Object.defineProperty (impl, '_source', {value:_source})
    }
    function load (file, fail=false) {
        const resolved = resolve(dir,file)
        if (fs.isfile (resolved))  return found (require (resolved), file)
        else if (fail)  throw new Error(`No such handler for ${def.name}: ${resolved}`)
    }
}

/**
 * Resolve a service endpoint path to mount it to as follows...
 * Use _path or def[@path] if given with leading '/' prepended if necessary.
 * Otherwise, use the service definition name with stripped 'Service'
 */
exports.path4 = function (def, _path = def['@path']) {
  if (_path)  return _path.replace(/^[^/]/, c => '/'+c)
  else  return '/' + ( // generate one from the service's name
    /[^.]+$/.exec(def.name)[0]  //> my.very.CatalogService --> CatalogService
    .replace(/Service$/, '')        //> CatalogService --> Catalog
    .replace(/^[A-Z]/, c => c.toLowerCase())  //> Catalog --> catalog
    .replace(/[A-Z]/g, c => '-'+c.toLowerCase())  //> FooBar --> foo-bar
  )
}
