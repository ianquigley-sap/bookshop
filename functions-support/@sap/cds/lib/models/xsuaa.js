const cds = require('../cds')
const fs = require('../utils/fs')
const path = require('path')

const hardcoded = {
  Scopes: ['authenticated-user', 'registered-user', 'identified-user', 'any'],
  Attributes: ['id']
}

module.exports = { xsuaaConfig }

function xsuaaConfig (model, options) {
  const base = getBaseModel(options)
  const generated = generateConfig(model)
  return mergeConfig(base, generated)
}

function generateConfig(model) {
  const roleTemplates = {}
  const scopes = {}
  const attributes = {}

  const updateRoleTemplate = (scope, attributes=[]) => {
    if (roleTemplates[scope]) {
      attributes.forEach(a => {
        if (!roleTemplates[scope]['attribute-references'].includes(a)) {
          roleTemplates[scope]['attribute-references'].push(a)
        }
      })
    } else {
      roleTemplates[scope] = {
        name: scope,
        description: 'generated',
        'scope-references': ['$XSAPPNAME.' + scope],
        'attribute-references': attributes
      }
    }
  }

  const findUserAttrInExpression = (expr, attributes=[]) => {
    if (Array.isArray(expr)) { // descend arrays
      expr.forEach(e => findUserAttrInExpression(e, attributes))
    }
    else if (typeof expr === 'object' && expr.ref) {
      const userIdx = expr.ref.indexOf('$user')
      if (userIdx >= 0 && userIdx < expr.ref.length-1) {
        const attr = expr.ref[userIdx + 1]
        if (!hardcoded.Attributes.includes(attr))  attributes.push(attr)
      }
    }
    return attributes
  }

  const parseAttributes = (condition) => { // e.g. 'foo = $user.bar or baz = $user.boo'
    if (!condition)  return []

    try {
      // {"xpr":[{"ref":["foo"]},"=",{"ref":["$user","bar"]},"or",{"ref":["baz"]},"=",{"ref":["$user","boo"]}]}
      const expr = cds.parse.expr(condition)
      // find paths value following $user, i.e. 'bar' and 'boo'
      return findUserAttrInExpression(expr.xpr)
    } catch (err) {
      throw new Error(`${err.message} in '${condition}'`)
    }
  }

  cds.reflect(model).foreach(def => {
    const scope = def['@requires']
    if (scope && !hardcoded.Scopes.includes(scope)) {
      scopes[scope] = scope
      updateRoleTemplate(scope)
    }

    const annotationRes = def['@restrict']
    if (annotationRes) {
      annotationRes.forEach(restriction => {
        const scope = restriction.to
        const lattributes = parseAttributes(restriction.where)
        if (scope && !hardcoded.Scopes.includes(scope)) {
          scopes[scope] = scope
          updateRoleTemplate(scope, lattributes)
        }
        lattributes.forEach(attr => attributes[attr] = true)
      })
    }
  })

  return {
    scopes: Object.keys(scopes).map((s) => {
      return {
        name: '$XSAPPNAME.' + s,
        description: s
      }
    }),
    attributes: Object.keys(attributes).map((a) => {
      return {
        name: a,
        description: a,
        valueType: 's'
      }
    }),
    'role-templates': Object.values(roleTemplates)
  }
}

function mergeConfig(base, generated) {
  const result = base
  result.xsappname = base.xsappname || appName()
  result['tenant-mode'] = base['tenant-mode'] || 'dedicated'

  const mergeByName = (type) => {
    if (!generated[type])  return

    if (!result[type])  result[type] = []
    result[type] = result[type].concat(generated[type].filter((g) => {
      if (!base[type].find)  throw new Error(`Array expected for '${type}', but was: ${JSON.stringify(base)}`)
      return !(base[type].find((b) => b.name === g.name ))
    }))
  }
  mergeByName('scopes')
  mergeByName('attributes')
  mergeByName('role-templates')

  return result
}

function getBaseModel(options={}) {
  if (typeof options.base === 'string') {
    try {
      return JSON.parse(options.base) // plain object
    } catch (err) {
      try {
        return JSON.parse(fs.readFileSync(path.resolve(options.base))); // file
      } catch (err2) {
        throw new Error('Neither a JSON object nor a file path: ' + options.base)
      }
    }
  }
  return options.base || {}
}

function appName() {
  let name
  try {
    name = require (path.resolve ('package.json')).name
  } catch (err) { // no package.json
    name = path.basename(process.cwd())
  }
  // remove any @foo/ from @foo/bar, truncate to max length
  return name.split('/').pop().substring(0, 100)
}
