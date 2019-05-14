const cds = require('@sap/cds')
// const sqlite3 = require('sqlite3')
// const CDSSrvCat = require('../srv/cat-service.cds')
// cds.connect ('sqlite:my.db')

// const app = require('express')()

// app.listen(9000);




// testing


'use strict';
const express = require('express');
const serverless = require('serverless-http');
const app = express();
// const bodyParser = require('body-parser');

// const router = express.Router();
// router.get('/', (req, res) => {
//     res.writeHead(200, { 'Content-Type': 'text/html' });
//     res.write('<h1>Hello from Express.js!</h1>');
//     res.end();
// });
// router.get('/another', (req, res) => res.json({ route: req.originalUrl }));
// router.post('/', (req, res) => res.json({ postBody: req.body }));
//
// app.use(bodyParser.json());
// app.use('/.netlify/functions/server', router);  // path must route to lambda

cds.serve('CatalogService').from('srv').in(app)
cds.serve('all').in(app)

module.exports = app;
module.exports.handler = serverless(app);