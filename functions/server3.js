const cds = require('@sap/cds')

var morgan = require('morgan')


if (1===2){
require('../srv/cat-service.cds')
require('../srv/cat-service')
require('../db/data-model.cds')
}

// testing


'use strict';
const express = require('express');
const serverless = require('serverless-http');
const app = express();

app.use(morgan('dev'))

cds.serve('CatalogService').from('srv').in(app)
cds.serve('all').in(app).at('/.netlify/functions/server3') // path must route to lambda
// app.listen()

module.exports = app;
module.exports.handler = serverless(app);