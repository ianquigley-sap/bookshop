import { Model as csn, Association as ParsedAssociation, entity, kind } from "./specs/CSN"
import { Query } from "./specs/CQN";

export function clone (model : csn) : csn
/** @see [capire](https://github.wdf.sap.corp/pages/cap/node.js/api#cds-reflect) */
export function linked (model : csn) : LinkedModel
/** @see [capire](https://github.wdf.sap.corp/pages/cap/node.js/api#cds-reflect) */
export function reflect (model : csn) : ReflectedModel
/** @see [capire](https://github.wdf.sap.corp/pages/cap/node.js/api#cds-reflect) */
export function reflect (def : linked) : Definition
export function infer (query : Query, model : csn) : linked

export type Definitions = { [name:string]: Definition }
export type Definition = linked | entity | Association
type Visitor = (def:Definition, name:string, parent:Definition, defs:Definitions) => void
type Filter = string | ((def:Definition) => boolean)


/**
 * Applying cds.reflect in a model ensures that all contained definitions have their `name` and `kind` filled in.
 */
export interface linked {
	is (kind: kind | 'Association' | 'Composition') : boolean
    name : string
}

interface Association extends linked, ParsedAssociation {
	is2one : boolean
    is2many : boolean
}

interface entity extends linked, entity {
	keys : Definitions
}


export interface LinkedModel extends ReflectedModel {}
export interface ReflectedModel extends csn {

	/**
     * Fetches definitions matching the given filter, returning an iterator on them.
	 * @example
	 * 		let m = cds.reflect (aParsedModel)
	 *      for (let d of m.each('entity'))  console.log (d.kind, d.name)
	 *      let entities = [...m.each('entity')]  //> capture all
	 *      let entities = m.all('entity')          //> equivalent shortct
	 */
	each (x:Filter, defs?: Definitions) : IterableIterator<linked>

	/**
     * Fetches definitions matching the given filter, returning them in an array.
	 * Convenience shortcut for `[...reflect.each('entity')]`
     */
	all (x:Filter, defs?: Definitions) : linked[]

	/**
     * Fetches definitions matching the given filter, returning the first match, if any.
	 * @example
	 *      let service = model.find('service')
	 * @param {Filter} [x]  the filter
	 * @param {Definitions} [defs]  the definitions to fetch in, default: `this.definitions`
	 */
	find (x:Filter, defs?: Definitions) : linked

	/**
     * Calls the visitor for each definition matching the given filter.
	 * @see [capire](https://github.wdf.sap.corp/pages/cap/node.js/api#cds-reflect-foreach)
	 */
	foreach (x?:Filter, visitor?:Visitor, defs?: Definitions) : this

	/**
     * Same as foreach but recusively visits each element definition
	 * @see [capire](https://github.wdf.sap.corp/pages/cap/node.js/api#cds-reflect-foreach)
	 */
	forall (x?:Filter, visitor?:Visitor, defs?: Definitions) : this

    /**
     * Fetches definitions declared as children of a given parent context or service.
	 * It fetches all definitions whose fully-qualified names start with the parent's name.
	 * Returns the found definitions as an object with the local names as keys.
	 * @example
	 *      let service = model.find ('service')
	 *      let entities = m.childrenOf (service)
	 * @param parent  either the parent itself or its fully-qualified name
	 * @param filter  an optional filter to apply before picking a child
	 */
	childrenOf (parent:linked|string, filter?) : Definitions

	/**
     * Provides convenient access to the model's top-level definitions.
	 * For example, you can use it in an es6-import-like fashion to avoid
	 * working with fully-qualified names as follows:
	 *
	 * @example
	 * let model = cds.reflect (cds.parse(`
	 *     namespace our.lovely.bookshop;
	 *     entity Books {...}
	 *     entity Authors {...}
	 * `))
	 * const {Books,Authors} = model.exports
	 * SELECT.from (Books) .where ({ID:11})
	 */
	exports : Definitions & ((namespace: string) => Definitions)
	entities : Definitions & ((namespace: string) => Definitions)
	services : Definitions & ((namespace: string) => Definitions)

}
