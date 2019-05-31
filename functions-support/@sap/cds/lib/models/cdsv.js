const cds = require('../cds'), cdsv = _emitting ( cds._compiler )
const { cdsc, sql_mapping } = cds.env,  _ = (...options) => Object.assign ({}, cdsc, ...options)

module.exports = {
  compile: (filenames, dir, o, _files) => cdsv.compile (filenames, dir,_(o), _files) .then (_csn4),
  parse: (sources,o) => _csn4 (cdsv.compileSources(sources, _(o))),
  parseCql: cdsv.parseToCqn,
  parseExpr: cdsv.parseToExpr,
  forOData: (csn,o) => _csn4x (cdsv.toOdata(_xsn4(csn),_(o, { csn:true, names: o && o.sql_mapping || sql_mapping }))),
  forSql: (csn,o) => _csn4x (cdsv.toSql(_xsn4(csn),_(o, { csn:true, names: o && o.sql_mapping || sql_mapping }))),
  toHana: (csn,o) => cdsv.toHana(_xsn4(csn),_(o, {toHana:{ names: o && o.sql_mapping || sql_mapping, associations: 'assocs' }})),
  toCdl: (csn,o) => cdsv.toCdl(_xsn4(csn),_(o)),
  toSql: (csn,o) => cdsv.toSql(_xsn4(csn),_(o)),
  toSwagger: (csn,o) => cdsv.toSwagger (_xsn4(csn),_(o)),
  toOdata: (csn,o) => cdsv.toOdata (_xsn4(csn),_(o)),
  collectSources: (...args) => cdsv.collectSources(...args),
}


function _csn4x (both) {
  return _csn4 (both._augmentedCsn, both.csn)
}

/** Returns a given model as plain csn.
 * The original augmented model is stored in the hidden property `_xsn`
 * @param model - an xsn or a csn
 * @param _csn - a raw compacted csn already obtained from cdsv
 */
function _csn4 (model, _csn) {

  if (!('messages' in model))  return model  // not an xsn --> likely a csn
  if (!_csn && model._csn)  return model._csn  //> an xsn for which we already got a csn

  const csn={}, xsn=model

  // add/restore namespace of first source
  const first = xsn.sources [Object.keys(xsn.sources)[0]]
  const ns = first.namespace
  if (ns)  csn.namespace = ns.path ? ns.path.map(x => x.id).join('.') : ns

  // get csn for xsn from cdsv
  Object.assign (csn, _csn || cdsv.toCsn(xsn))

  // keep _sources and _xsn twin as hidden properties
  Object.defineProperties (csn, {
    _xsn: {value:xsn, configurable:1, writable:1 },
    _sources: {value: Object.keys (xsn.sources) },
  })

  // keep _locations as hidden properties
  const defs = csn.definitions; for (let each in defs) {
    const d = defs[each], loc = xsn.definitions[each].location
    Object.defineProperty (d, '_location', {value:loc})
    if (!d['@source'] && d.kind === 'service')  d['@source'] = loc.filename  //> enumerable
  }

  // cache _csn to _xsn only in normalized models, i.e. not the flattened OData csn
  if (!_csn)  Object.defineProperty (xsn, '_csn', {value:csn, configurable:1, writable:1 })

  // forward support for Association to many smartly resolving their back links
  if (cdsc.smart.to_many)  require ('./2many')(csn)

  return csn
}


/** Returns a given model as an augmented one.
 * This is necessary because severel cdsv operations seem to always expect
 * augmented models created from own parser and don't work with plain CSNs
 * from other sources??
 */
function _xsn4 (model) {
  if (model._parsed)  model = model._parsed
  if (model.messages) return model   // it is already an augmented one
  if (model._xsn) return model._xsn   // came from cdsv before
  // doesn't stem from cdsv... (yes, this is all pretty crazy)
  let csn=model, xsn = cdsv.compileSources({'boo.json': JSON.stringify(csn, (k,v) => {
  //> fix: cdsv doesn't accept '.json' anymore
    if (k === 'namespace') return
    return v
  })})
  Object.defineProperty (csn, '_xsn', {value:xsn})
  Object.defineProperty (xsn, '_csn', {value:csn})
  return xsn
}


// Add .toString() support to cdsv's composite errors class
const { CompilationError } = require('@sap/cds-compiler/lib/base/messages')
Object.defineProperties (CompilationError.prototype, {
  toString: {value: function(){
    return this.errors && this.errors.reduce((p,e) => p + (
      e.location ? (' at '+e).replace (': Error: ',': ')
        .replace ('Extraneous input','invalid token')
        .replace(/ expecting {(<EOF>, )?([^}]*)}/, (str,_,p1) => ` - expected one of `+ p1.toLowerCase() + '.')
      : e
    ) + '\n', '')
  }}
})

// decorate all cdsv functions with one that emits messages after it was called
function _emitting (cdsv) {
  const emitter = {}
  for (let p of Reflect.ownKeys(cdsv)) {
    let v = Reflect.getOwnPropertyDescriptor(cdsv, p).value
    if (typeof v === 'function') {
      emitter[p] = (...args) => {
        const r = cdsv[p] (...args)
        return (r instanceof Promise) ? r.then (_emit) : _emit (r)
      }
    } else { emitter[p] = v }
  }
  return emitter
}

function _emit (o) {
  if (Array.isArray (o.messages)) {
    o.messages.forEach (m => cds.emit ('compilationMessage', m))
  }
  return o
}