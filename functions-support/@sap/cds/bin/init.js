const generator = require('@sap/generator-cds');
const cds = require('../lib/cds');

module.exports = Object.assign (_init, {
    options: generator.init.options,
    flags: generator.init.flags,
    help: generator.init.help.replace(/cds-gen/g, 'cds')
});

function _init (args, options) {
    return generator.init.command.run(args, options, cds.env);
}
