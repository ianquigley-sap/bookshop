'use strict';
const cds = require('@sap/cds')

if (1===2){
require('../srv/cat-service.cds')
require('../srv/cat-service')
require('../db/data-model.cds')
}



const express = require('express');
const serverless = require('serverless-http');
const app = express();


cds.serve('CatalogService').from('srv').in(app)
cds.serve('all').in(app).at('/.netlify/functions/catalog/')

module.exports = app;
module.exports.handler = serverless(app);