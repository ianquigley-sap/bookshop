import { Query, expr } from "./specs/CQN"
import { Model } from "./specs/CSN"

type csn = Model
type cqn = Query

/**
 * Provides a set of methods to parse a given model, query or expression.
 * You can also use `cds.parse()` as a shortcut to `cds.parse.cdl()`.
 */
export const parse : {
    /** Shortcut to `cds.parse.cdl()` */
    (src: string) : csn
    cdl (src:string) : csn
    cql (src:string) : cqn
    expr (src:string) : expr
}


/**
 * Provides a set of methods to parse a given model, query or expression.
 * You can also use `cds.compile(csn).to('<output>')` as a fluent variant.
 */
export const compile : {
    for: {
        odata (model:csn) : csn
    },
    to: {
        json (model:csn) : string
        yaml (model:csn) : string
        cdl (model:csn) : string
        sql (model:csn) : string
        edm (model:csn) : string
        edmx (model:csn) : string
    }
    /** Shortcut to `cds.parse.cdl()` */
    (csn: csn) : {
        for: ( output: 'json' | 'yaml' | 'yml' | 'sql' | 'cdl' | 'edm' | 'edmx', options? ) => csn
        to: ( output: 'json' | 'yaml' | 'yml' | 'sql' | 'cdl' | 'edm' | 'edmx', options? ) => string
    }
}



/**
 * Loads and parses models from the specified files.
 * Uses `cds.resolve` to fetch the respective models.
 * @param {string} model - the name of a model or a folder containing models
 */
export function load (model:string) : Promise<csn>


/**
 * Resolves the given module name to an array of absolute file names.
 * Uses Node's `require.resolve` internally with the following additions:
 * - relative names are resolved relative to the current working directory instead of the current JavaScript module; hence, use __dirname if you want to find or load models relative to the current module.
 * - if no file extension is given, `.csn` and `.cds` will be appended in that order.
 * @param {string} model - the node module name of a model or a folder containing models
 */
export function resolve (model:string) : [ string ]