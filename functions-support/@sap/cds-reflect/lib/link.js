const { reflect, infer, builtin:{types} } = require('../index'), { cached, set } = reflect
const { any, struct, array, context, service, entity, annotation } = types
const isLinked = Symbol()

module.exports = cached (m => {
	const rm = reflect(m,1)
	return rm[isLinked] ? rm : Object.defineProperty (rm, isLinked, {value:true})
	.foreach (_link)
	.foreach ('view', _infer)  //> 2nd pass to also resolve targets via paths in from clauses
})

function _link (d, name, parent, defs) {
	if (parent)  set (d,'parent', parent)
	if (!d.name)  set (d,'name', name)
	if (d.target)  set (d,'_target', _target (d.target,d,defs))
	if (d.via)  set (d,'_via', _target (d.via,d,defs))
	if (d.items)  _link (d.items,name,d,defs)
	for (let e in d.elements) _link (d.elements[e],e,d,defs)
	try { d.__proto__ = ( // finally link it -> note: the above expect own properties only
		d.type ? _resolve (d.type,defs) :
		_kinds [d.kind] || (  // note: 'type' and 'element' have to be ignored
			d.elements ? struct :
			d.items ? array :
			any
		)
	)} catch(e) { throw new Error (
		`circular dependency thru ${d.name} > ${_protos(defs[d.type]).join(' > ')}`
	)}
	return d
}

function _infer  (v, n,p, defs) {
	const q = v.query;  if (!q.SELECT || !q.SELECT.from || !q.SELECT.from.ref)  return
	const t = v.__proto__ = infer (q,defs) || _unresolved ('invalid query?', entity)
    if (t)  Object.defineProperty (v,'source',{value: t.name})
}

function _protos (p) {
	for (var chain=[]; p && p.name; p = p.__proto__) chain.push (p.name)
	return chain
}

const _kinds = { annotation, context, service, entity, /*compat:*/ view:entity }
const _target = (x,d,defs) => typeof x === 'string' ? _resolve(x,defs) : _link(x,'<inline>',d,defs)
const _resolve = (x,defs) => defs[x] || types[x] || (defs[x] = _unresolved(x))
const _unresolved = (x,p=any)  => ({name:x, __proto__:p, isUnresolved:true})
