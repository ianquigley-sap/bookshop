const cds = require ('../cds'), lib = require ('@sap/cds-ql');  lib.inject (cds)
const ql = module.exports = $$(lib.statements, {
    connect: lib.connect.connect //> goes to ./connect.js
})
if (cds.env.features.localized) {
    const {connect:_unfold_localized} = require('../alpha/_localized')
    const _connect = ql.connect
    $$(ql, {
        connect: (...args) => {
            const ds = _connect (...args)
            ds.options && ds.options.kind === 'sqlite' && ds.options.model && ds.then  && ds.then (_unfold_localized)
            return ds
        }
    })
}

const m = cds.env.sql_mapping || cds.env.data.sql_mapping
const name4 = m === 'quoted' || m === 'hdbcds'
    ? name => '"'+name+'"'
    : name => name.replace (/\./g,'_')
const _datasource = '_datasource'

const ENABLE = (...fns) => { for (let fn of fns) fn() }
const DISABLED = ()=>{}  // dummy to cheat sonar
ENABLE (
    _ANY_isQuery,
    _SELECT_from_valueOf, _SELECT_distinct, // _SELECT_from_with_key,
    _INSERT_into_valueOf, _INSERT_entry_into,
    _UPDATE_entity_valueOf, _UPDATE_set_fluent, _UPDATE_with, //_UPDATE_with_key,
    _DELETE_from_valueOf,
)
DISABLED (
    _ANY_bound, _ANY_then, _SELECT_foreach,
    _SELECT_from_with_key, _UPDATE_with_key
)

// Adding support for bound queries, i.e. to entities obtained form a connected datasource
function _ANY_bound(){

    const { SELECT, UPDATE, INSERT, DELETE, DROP, CREATE } = ql
    const Select = require('@sap/cds-ql/lib/statements/Select')
    const _model = Symbol.for('cds.ql.model')

    DROP.entity = enhance (DROP.entity)
    DROP.table = enhance (DROP.table)
    DROP.view = enhance (DROP.view)
    CREATE.entity = enhance (CREATE.entity)
    SELECT.from = enhance (SELECT.from)
    Select.from = enhance (Select.from)
    DELETE.from = enhance (DELETE.from)
    INSERT.into = enhance (INSERT.into)
    ql.UPDATE = enhance (UPDATE)

    function enhance (_super) { return (entity, ...etc) => {
        const datasource = entity[_datasource]
        if (!datasource)  return _super (entity, ...etc)
        // if the given entity is a CSN definiton with datasource attached,
        // register that datasource as well as the datasource's model
        // with the query...
        entity = entity.__proto__ // REVISIT: this is because cds.ql works with .hasOwnProperties
        return $$(_super (entity, ...etc), {
            [_datasource]: datasource,
            [_model]: datasource.model,
        })
    }}
}

// Adding support for .then(...) to bound queries, e.g. SELECT.from(Foo).then(...)
function _ANY_then(){
    $$(ql.BaseStatement.prototype, {
        // Add .then(...) to the cds.ql statement prototype...
        then (...next) {
            const ds = this[_datasource]
            if (!ds)  return Promise.reject (new Error(
                `\n  You can only execute queries standalone if they've been constructed`+
                `\n  with an entity definition obtained from a connected datasource.`
            ))
            return ds.run(this).then(...next)
        },
    })
}

// Add support for SELECT.from('Foo') + '... plain sql tail...'
// NOTE: only works as SELECT * from ...
function _SELECT_from_valueOf(){
    const { SELECT } = ql
    $$(SELECT.from('x').__proto__, {
        valueOf(){
            return `SELECT * from ${name4(this.SELECT.from.ref.join('.'))} `
        }
    })
}

// Add support for SELECT.from('Foo',{ID:11})
function _SELECT_from_with_key(){
    const { SELECT } = ql, _super=SELECT.from
    SELECT.from = (entity, _arg) => {
        if (_arg) {
            if (Array.isArray(_arg))  return _super (entity) .columns (_arg)
            else if (typeof _arg === 'string')  entity = {ref:[entity], where: cds.parse.expr(_arg) }
            else if (typeof _arg === 'object')  entity = {ref:[entity], where: _predicate4(_arg) }
        }
        return _super(entity)
    }
}

// Add support for SELECT.distinct(...)
function _SELECT_distinct(){
    const { SELECT } = ql
    SELECT.distinct = (...args) => {
        const q = SELECT.from (...args)
        q.SELECT.distinct = true  // TODO: support in 2sql implementations
        return q
    }
}

// Add support for SELECT....foreach(...)
function _SELECT_foreach(){
    const { SELECT } = ql
    $$(SELECT.from('x').__proto__, {
        foreach (callback) {
            return this.then (rows => {
                for (let each of rows)  callback (each)
            })
        }
    })
}

// Adding indicator for repl to easily detect query objects
function _ANY_isQuery(){
    $$(ql.BaseStatement.prototype, {
        _isQuery:true,
    })
}

// Add support for DELETE.from('Foo') + '... plain sql tail...'
function _DELETE_from_valueOf(){
    const { DELETE } = ql
    $$(DELETE.from('x').__proto__, {
        valueOf(){
            return `DELETE from ${name4(this.DELETE.from)} `
        }
    })
}



// Add support for INSERT.into('Foo') + '... plain sql tail...'
function _INSERT_into_valueOf(){
    const { INSERT } = ql
    $$(INSERT.into('x').__proto__, {
        valueOf(){
            return `INSERT into ${name4(this.INSERT.into)} `
        }
    })
}

// Add support for INSERT(entry).into (entity)
function _INSERT_entry_into(){
    const { INSERT } = ql
    $$(ql.INSERT = (...entries)=>({
        //> INSERT(entry).into (entity)
        into:(entity) => INSERT.into(entity).entries(...entries)
    }),{
        //> INSERT.into (entity) ...
        into:(entity) => INSERT.into(entity)
    })
}

// Add support for UPDATE('Foo',{ID:11})...
function _UPDATE_with_key(){
    const { UPDATE } = ql, _super = UPDATE
    ql.UPDATE = (entity,_arg) => {
        // if (typeof _arg === 'object')  return _super (entity) .where (_predicate4(_arg))
        if (_arg)  return _super (entity) .where (_arg)
        return _super (entity)
    }
}


// Add support for UPDATE('Foo') + '... plain sql tail...'
function _UPDATE_entity_valueOf(){
    // FIXES the base implementation which ignores cds.env.sql_mapping
    const { UPDATE } = ql
    $$(UPDATE('x').__proto__, {
        valueOf(){
            return `UPDATE ${name4(this.UPDATE.entity)} `
        }
    })
}

// Add support for UPDATE('Foo').with(...) as alternative to .set(...)
function _UPDATE_with(){
    const { UPDATE } = ql
    $$(UPDATE('x').__proto__, {
        with(...args){ return this.set(...args) }
    })
}

// Add support for UPDATE('Foo').set ( expr | fragments | feather )
function _UPDATE_set_fluent(){ // NOSONAR
    const { UPDATE } = ql, update = UPDATE('x').__proto__, _super = update.set
    $$(update,{
        set(...args) {  // NOSONAR

            if (typeof args[0] === 'object') return _super.apply (this, args)
            const cqn = this.UPDATE.data = {}
            if (args.length === 1) for (let each of _split(args[0])) {
                const {xpr:[lhs,op,...rhs]} = cds.parse.expr (each)
                cqn[lhs.ref.join('.')] = _rhs (lhs, op, ...rhs)
            } else for (let i=0; i<args.length; ++i) {
                const [,col,op] = /\s*([\w.]+)\s*([%*+-]?=)/.exec (args[i])
                cqn[col] = _rhs (col, op, {val:args[++i]})
            }
            function _rhs (lhs, op, ...rhs) {
                if (op === '=')  return rhs.length === 1 ? rhs[0] : {xpr:rhs}
                if (op.length === 2 && op[1] === '=')  return {xpr:[ lhs.ref ? lhs : {ref:[lhs]}, op[0], ...rhs ]}
                else throw new Error ('Invalid operator in UPDATE(...).set() expression: '+ op)
            }
            return this
        }
    })

    function _split(s) {  // NOSONAR
        let all=[], start=0, scope=0, close=0, stack=[ close ]
        for (let i=0; i<s.length; ++i) {
            const c = s[i]
            if (c === ',' && !scope) {
                all.push(s.slice(start,i))
                start = i+1
            } else if (c === "'") {
                while (i<s.length) {
                    if (s[++i] === "'") {
                        if (s[i+1] === "'")  ++i  // NOSONAR
                        else break
                    }
                }
            }
            else if (c === '(') { scope++; stack.unshift(close=')') }
            else if (c === '[') { scope++; stack.unshift(close=']') }
            else if (c === '{') { scope++; stack.unshift(close='}') }
            else if (c === close) { scope--; stack.shift(); close = stack[0] }
        }
        all.push (s.slice(start))
        return all
    }
}

/**
 * Helper to more easily set writable properties
 */
function $$(o,p){
  for (let each in p) {
    const x = p[each];  if (x === undefined)  continue
    Object.defineProperty (o, each, {value:x, configurable:true, writable:true})
  }
  return o
}


/**
 * Helper to create a predicate from a feather object
 */
function _predicate4 (o) {
    const predicates = [null]
    for (let each in o) {
        predicates.push ({ref:each.split('.')}, '=', {val:o[each]})
    }
    return predicates.slice(1)
}
