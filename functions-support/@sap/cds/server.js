const express = require('express')
const cds = require('./lib/cds')

/** that's our pretty standard express server.js setup... */
const serve = module.exports = async (models,o) => {

    const app = express()

    // serve static resources
    app.use (express.static (cds.env.folders.app))  //> defaults to ./app
    app.get ('/', (_,res) => res.send (index.html))  //> if none in ./app
    app.use (logger)

    // connect to primary database if configured
    await cds.connect (cds.env.requires.db || false)

    // construct and mount modeled services
    await cds.serve (models,o) .in (app)

    // start http server
    const { PORT=4004 } = process.env
    return app.listen (PORT)

}

/** generic index.html --> served unless you have one in app folder */
const index = { get html(){

    if (this._html)  return this._html

    const { isfile } = cds.utils, {app} = cds.env.folders, {join} = require('path')
    const _has_fiori_html = isfile (join (app,'fiori.html'))

    return this._html = `
    <html>
        <head>
            <style>
                body { margin: 44px; font-family: sans-serif }
                h1 { font-weight:200 }
            </style>
        </head>
        <body>
            <h1> Welcome to <i>cds.services</i> </h1>
            <p> These are the paths currently served ...
            ${ _has_fiori_html ? `<h3><a href="/fiori.html">/fiori.html</a></h3>` : '' }
            ${ cds.service.providers.map (service => {
                const {path,entities} = service
                const exposed=[]; for (let e in entities)  exposed.push (e)
                return `
                <h3>
                    <a href="${path}">${path}</a> /
                    <a href="${path}/$metadata">$metadata</a>
                </h3>
                <ul>${exposed.map (e => `
                    <li><a href="${path}/${e}">${e}</a></li>`).join('')}
                </ul>`
            }) .join('')}
        </body>
    </html>
    `
}}

/** simple logger --> you might want to use morgan instead */
const logger = (req,_,next)=>{
    console.log (req.method, req.url); next()  // eslint-disable-line
}

if (!module.parent)  serve('all')
