'use strict';
const express = require("serverless-express/express");
const app = express();
const cds = require("@sap/cds");

// app.use(morgan('dev'))
cds.serve('all').from('srv').in(app)
// cds.serve('all').in(app).at('/.netlify/functions/server3') // path must route to lambda
// app.listen()

module.exports = app;
module.exports.handler = app;
