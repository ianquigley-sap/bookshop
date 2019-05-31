const { builtin:{types:{entity}} } = require('../index')
const { inspect } = require('util')

module.exports = function cds_infer_query (q, defs) {

	if (q.target)  return q.target

    const { SELECT, INSERT, UPDATE, DELETE } = q
    const entity = (
        SELECT ? SELECT.from.ref :
        INSERT ? INSERT.entity :
        UPDATE ? UPDATE.entity :
        DELETE ? DELETE.entity :
        _invalidQuery(q)
    )
    try {
        const target = (
            !entity ? undefined  :
            (typeof entity === 'string') ? _resolve (entity, defs)  :
            entity.name ? _resolve (entity.name, defs)  :
            entity.length>1 ? _infer (entity, defs)  :  _resolve (entity[0], defs)
        )
        Object.defineProperty (q,'target',{value:target})
        return target
    } catch (e) {
        throw new Error ('cannot resolve target of query: '+ inspect(q,{depth:11}))
    }
}

function _infer (ref, defs) {
	let target = _resolve (ref[0].id||ref[0], defs)
	for (let i=1; i<ref.length; ++i) {
        const r = ref[i].id || ref[i]
        let a = target.elements[r] || _unresolved (target.name +':'+r)
        target = a._target || _unresolved(a.target)
	}
    return target
}

function _invalidQuery() {
    throw new Error ('query is expected to be one of { SELECT | INSERT | UPDATE | DELETE }')
}
const _resolve = (x,defs) => defs[x] || (defs[x] = _unresolved(x))
const _unresolved = (x,p=entity)  => ({name:x, __proto__:p, isUnresolved:true})
