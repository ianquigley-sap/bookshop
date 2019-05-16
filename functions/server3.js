const cds = require('@sap/cds')
// const sqlite3 = require('sqlite3')
// const CDSSrvCat = require('../srv/cat-service.cds')
// cds.connect ('sqlite:my.db')

// const app = require('express')()

// app.listen(9000);

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


// const bodyParser = require('body-parser');
//Test
// const router = express.Router();
// router.get('/', (req, res) => {
//     res.writeHead(200, { 'Content-Type': 'text/html' });
//     res.write('<h1>Hello from Express.js!</h1>');
//     res.end();
// });
// router.get('/another', (req, res) => res.json({ route: req.originalUrl }));
// router.post('/', (req, res) => res.json({ postBody: req.body }));
//
// // app.use(bodyParser.json());
// app.use('/.netlify/functions/server3', router);  // path must route to lambda

cds.serve('CatalogService').from('srv').in(app)
cds.serve('all').in(app).at('/.netlify/functions/server3/')
// app.listen()

module.exports = app;
module.exports.handler = serverless(app);