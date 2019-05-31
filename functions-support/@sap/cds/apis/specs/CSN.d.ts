import { SELECT, expr, predicate, column_expr } from "./CQN"

export type csn = Model

/** A parsed model. */
export interface Model {

    /** The assigned namespace. If parsed from multiple sources, this is the topmost model's namespace, if any, not the ones of imported models. */
    namespace? : string

    /** The list of usings in this parsed model. Not available after imports have been resolved into a merged model. */
    using? : { name: string, as?: string, from?: string }[]

    /** All definitions in the model including those from imported models. */
    definitions? : Definitions

    /** All extensions in the model including those from imported models. Not available after extensions have been applied. */
    extensions? : Definition[]
}

export type Definition = type & struct & entity & Association
export interface Definitions {
    [name:string]: Definition
}

export type kind = 'context' | 'service' | 'type' | 'entity' | 'element' | 'const' | 'annotation'
export type Element = type & struct & {
    kind : 'element' | undefined
}

export interface type {
    kind? : kind
    type? : string
}

export interface struct extends type {
    /** structs have elements which are in turn Definitions */
    elements? : { [name:string]: Element }
    /** References to definitions to be included. Not available after extensions have been applied. */
    include? : string[]
}

export interface entity extends struct {
    kind : 'entity'
    /** Entities with a query signify a view */
    query?: SELECT & { cql: string }
    /** Elements of entities may have additional qualifiers */
    elements? : {
        [name:string]: Element & {
            key? : boolean
            virtual? : boolean
            unique? : boolean
            notNul? : boolean
        }
    }
}

export interface Association extends type {
    type : 'cds.Association' | 'cds.Composition'
    /** The fully-qualified name of the Association's target entity */
    target : string
    /** The specified cardinality. to-one = {max:1}, to-many = {max:'*'} */
    cardinality? : {src?,min?,max?}
    /** The parsed on condition in case of unmanaged Associations */
    on? : predicate
    /** The optionally specified keys in case of managed Associations */
    keys? : column_expr[]
}
