module.exports = Object.assign(activate, {
    options: ['--username', '--tenant', '--to'],
    flags: ['--undeploy'],
    shortcuts: ['-u', '-t'],
    help: `
# SYNOPSIS

    *cds activate* [ <project> ] [ --to <url> ]

   Activate an extension project


# OPTIONS

    *-u* | *--username* <name> 

        The username for authentication.
        
    *-t* | *--tenant* <tenant>
    
        Override the tenant to extend (Otherwise taken from JWT token).    
        
    *--to* <url>
        The url to activate.
        
    *--undeploy* 
        Undeploy a previously deployed extension.
        
    *--skip-csrf*
        Skip fetching a csrf token before uploading the extension.           

`})


async function activate ([folder], options = {}) {
    try {
        const client = require('@sap/cds-sidecar-client')
        const { askQuestion, askBooleanQuestion } = client.question

        if (!folder) {
            folder = await askQuestion('Project root folder: ')
        }

        if (!options.to) {
            options.to = await askQuestion('Application URL: ')
        }

        if (!options.username) {
            options.username = await askQuestion('Username: ')
        }

        if (options.undeploy === undefined) {
            options.undeploy = await askBooleanQuestion('Undeploy previously deployed extension [yN]')
        }

        options.password = await askQuestion('Password: ', undefined, true)

        const collectSources = require('../lib/models/cdsv').collectSources
        const cds = require('../lib/cds')

        const injection = {
            collectSources,
            cds
        };

        try {
            await client.apply(injection, folder, options)
        } catch (e) {
            console.error('\n[ERROR] Failed to activate extension\n\n' + e.message)
        }

    } catch (e) {
        console.log('This feature requires cds-sidecar-client to be installed')
    }

}



/* eslint no-console: off */
