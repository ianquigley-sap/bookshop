const cds = require('../cds')

let mtx

try {
    mtx = require ('@sap/cds-mtx')()
    const cdsv = require('../models/cdsv')

    mtx.inject(cds, cdsv)
} catch(e) {
    // do nothing
}

module.exports = mtx
