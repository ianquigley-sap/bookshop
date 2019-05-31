class any {

	static mixin (...aspects) { _mixin (this.prototype, ...aspects) }
	mixin (...aspects) { _mixin (this, ...aspects); return this }
	constructor(...aspects){ _mixin(this,...aspects) }

	set kind(k) { this.set('kind',k) }
	get kind(){
		return this.kind = this.parent ? 'element' : this.query ? 'entity' : 'type'
	}

	is (kind) {
		if (typeof kind === 'function')  return this instanceof kind
		if (kind === 'struct')  return this.elements !== undefined
		else return this.kind === kind
	}
	own (property) {
		let pd = Reflect.getOwnPropertyDescriptor (this, property)
		if (pd)  return pd.value || pd.get(this)
	}
	set (property, value) {
		Reflect.defineProperty (this, property, { value, writable:1, configurable:1 })
        return value
	}
}


class entity extends any {

	is (kind) {
		if (kind === 'view')  return this.query !== undefined
		return kind === 'entity' || kind === 'struct' || super.is(kind)
	}

	set keys(k) { this.set('keys',k) }
	get keys() {
		let ee=this.elements, keys, dict={}
		for (let e in ee)  if (ee[e].key)  (keys=dict)[e] = ee[e]
        return this.keys = keys
	}
}


class Association extends any {

	is (kind) {
		return kind === 'Association' || this.type.endsWith(kind) || super.is(kind)
	}

    get is2many() { return !this.is2one }
	get is2one() {
		let c = this.cardinality
		return !c || c.max === 1 || !c.max && !c.targetMax || c.targetMax === 1
	}

	set foreignKeyElements(k) { this.set('foreignKeyElements',k) }
	get foreignKeyElements() {
		const {keys} = this; if (!keys)  return this.foreignKeyElements = undefined
		const fks={}, {elements} = this._target
		for (let k of keys)  fks[k.as || k.ref[0]] = elements [k.ref[0]]
		return this.foreignKeyElements = fks
	}

	set keys(k) { this.set('keys',k) }
	get keys() {
		if (this.on || this.is2many || !this._target)  return this.keys = undefined
		const keys=[], tks = this._target.keys
		for (let k in tks)  keys.push ({ ref: [tks[k].name] })
		return this.keys = keys
	}
}


const classes = module.exports = {
	any, entity, Association, __proto__:{
	bootstrap (defs) {
		for (let n in defs) {
			const base = this[defs[n].type] || any, predefined = this[n]
			const c = classes[n] = Object.defineProperty (class extends base {}, 'name', {value:n})
			if (predefined)  c.mixin (predefined)
			defs[n] = c.prototype
		}
		defs.any = any.prototype
		return defs
	},
	mixin (...classes) {
		for (let m of classes) {
			const c = this[m.name]; if (!c)  throw new Error (`unknown class '${m.name}'`)
			c.mixin(m)
		}
		return this
	}
}}

function _mixin (o, ...aspects) {
	for (let each of aspects) {
		const aspect = each.prototype || each
		for (let p of Reflect.ownKeys(aspect)) {
			p in {constructor:1,prototype:1} || Reflect.defineProperty (
				o, p, Reflect.getOwnPropertyDescriptor (aspect,p)
			)
		}
	}
}
