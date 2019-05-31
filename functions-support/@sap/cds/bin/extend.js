module.exports = Object.assign(extend, {
    options: ['--username', '--tenant'],
    shortcuts: ['-u', '-t'],
    help: `
# SYNOPSIS

    *cds extend* [ <model> ]

   Create an extension project from url [url]


# OPTIONS

    *-u* | *--username* <name> 

        The username for authentication.
        
    *-t* | *--tenant* <tenant>
    
        Override the tenant to extend (Otherwise taken from JWT token).    

`})


async function extend ([url], options = {}) {
    try {
        const client = require('@sap/cds-sidecar-client')
        const askQuestion = client.question.askQuestion


        if (!url) {
            url = await askQuestion('Extension Url: ')
        }

        if (!options.username) {
            options.username = await askQuestion('Username: ')
        }

        options.password = await askQuestion('Password: ', undefined, true)

        client.extend(url, options)
    } catch (e) {
        console.log('This feature requires cds-sidecar-client to be installed')
    }

}



/* eslint no-console: off */
