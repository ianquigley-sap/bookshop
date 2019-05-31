module.exports = Object.assign ( serve, {
    options: ['--to', '--at', '--with'],
    shortcuts: ['-2', '-a', '-w'],
    help: `
# SYNOPSIS

    *cds serve* <service> [ --at <endpoint> ] [ --with <impl> ] [ --to <protocol> ]
    *cds serve* all

    Starts an http server which generically serves the specified service(s).
    If used with _all_ for the services, it will look up according configuration
    from _package.json_ or _.cdsrc.json_ and serve each configured service.

`})

async function serve (models, options) {

    const timer = '[cds] - launched in';
    console.time (timer)
    console.log()

    const server = await require('../server')(models, options)
    console.log (`[cds] - server listens at http://localhost:${server.address().port}`, '... (terminate with ^C)')
    console.timeEnd (timer)

}


const cds = require('../lib/cds')
cds.on ('connect', ({options:{kind,model,credentials}})=>{
    const spec = credentials && credentials.database || model
    console.log (`[cds] - connect to datasource - ${kind}:${spec}`)
})
cds.on ('serve', ({name,path,impl})=>{
    console.log (`[cds] - serving ${name} at ${path}${impl ? ' - impl: ' + _local(impl._source) : ''}`)
})
cds.on ('served', ({_sources})=>{
    console.log (`[cds] - service definitions loaded from:\n\n  ${_sources.map(_local).join('\n  ')}\n`)
})
const {relative} = require('path')
const _local = (filename) => relative('', filename)
/* eslint no-console:off */