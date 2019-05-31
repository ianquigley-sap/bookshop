/** Both, a namespace and a shortcut for cds.parse.cdl */
const parse = module.exports = Object.assign ((...args) => parse.cdl(...args), {

  /** @returns {object} the parsed model as a CSN object */
  cdl: (...args) => (parse.cdl = require('./cdsv').parse) (...args),

  /** @returns {object} the parsed query as a CQN object */
  cql: (...args) => (parse.cql = require('./cdsv').parseCql) (...args),

  /** @returns {object} the parsed expression as a CQN expr object */
  expr: (...args) => (parse.expr = require('./cdsv').parseExpr) (...args),
  /*
   * Change to following once it supports inline as a filter
   * expr: (...args) => (parse.expr = _require('./cdsv').parseToExpr) (...args),
   */

  xpr: x => parse.expr(x).xpr,
  ref: x => parse.expr(x).ref,

})
const _require = require // workaround for vscode IntelliSense


/* eslint no-unused-vars:0  */