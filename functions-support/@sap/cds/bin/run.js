module.exports = Object.assign (run, {
    flags: [ '--debug' ],
    help: `
# SYNOPSIS

    *cds run* [ <project> ]

    Starts an http server which loads models from the given folder, or from
    the current working directory if omitted, and  generically serves all
    services defined in the found models.

`})


const cluster = require ('cluster')
const serve = require ('./serve')

function run (projects=[]) {

    if (cluster.isMaster) {

        if (projects.length === 0)  return serve (['all'])
        if (projects.length === 1)  { process.chdir (projects[0]); return serve (['all']) }
        if (!process.argv[1])  process.argv[1] = __filename

        let port = 4004
        for (let each of projects) {
            console.log (`[cds] - running ${each}...`)
            cluster.fork ({ each, PORT:port++ })
        }

    } else {

        process.chdir (process.env.each)
        return serve (['all'])

    }

}
/* eslint no-console:off */
