const path = require('path')
const fs = require('fs')
const cwd = process.cwd()

module.exports = function cds_resolve (model, options={}) {

    if (!model || model === '--')  return
    if (Array.isArray(model))  return model._resolved || _resolved (model.reduce (
        (prev, next) => prev.concat (this.resolve(next,options)||[]) , []
    ))
    const base = path.resolve (options.root || this.cwd || cwd, model)

    // ... use an existing file under the given name w/ suffix .csn, .cds or .json
    for (let each of [ '.csn', '.cds', '.json' ]) {
        let model = base+each
        if (_exists(model))  return _resolved([model])
    }

    if (_isdir (base)) {  //> in case of a folder...

        // ... use ./index.cds or  ./index.json if present
        for (let each of ['csn.json', 'index.csn', 'index.cds']) {
            let model = path.join (base,each)
            if (fs.existsSync(model))  return _resolved([model])
        }

        // ... else use all .csn or .cds files in there
        if (options.all !== false) {
            let models = _fetchAll(base)
            return _resolved(models)
        }

    } else {  //> not a folder...

        // ... use an existing file under the given name
        if (_exists(base))  return _resolved([base])

    }
}


function _fetchAll (base) {
    let all = fs.readdirSync(base), models=[], unique={}
    for (let f of all)
        if (f.endsWith('.csn')) {
            models.push (unique[f.slice(0,-4)] = path.join (base,f))
        }
    for (let f of all)
        if (f.endsWith('.cds')) {
            unique[f.slice(0,-4)] || models.push (path.join (base,f))
        }
    return models
}

function  _resolved (models) {
    if (models.length > 0)  return Object.defineProperty (models, '_resolved',{value:models})
}
function _isdir (file) {
    return fs.existsSync(file) && fs.lstatSync(file).isDirectory()
}
function _exists (file) {
    return fs.existsSync(file) && fs.lstatSync(file).isFile()
}