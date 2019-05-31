const core = require ('@sap/cds-reflect'), $=require;  require = (id)=> lazy=> $(id)  // eslint-disable-line
const cds = module.exports = global.cds = Object.assign ( core, {

    // Model Processing
    resolve: require ('./models/resolve'),
    load: require ('./models/load'),
    parse: require ('./models/parse'),
    compile: require ('./models/compile'),
    localize: require ('./models/i18n'),
    unfold: lazy => cds.compile,
    get: lazy => cds.load.only,

    // Services and Querying
    connect: require ('./runtime/connect'),
    service: require ('./runtime/service'),
    serve: require ('./runtime/serve'),
    ql: require ('./runtime/ql'),
    services: {},

    // Multitenancy and Extensibility
    mtx: require('./mtx'),

    build: require('./build'),

    // Helpers
    in: cwd => !cwd ? cds : {__proto__:cds, cwd, env:cds.env.in(cwd) },
    require: require ('./utils/require-local'),
    env: require ('./utils/config'),  get config(){ return this.env },
    utils: require ('./utils/fs'), write: lazy => cds.utils.write,
    exec: require ('../bin/cds'),
    home: lazy => __dirname.slice(0,-4),
    version: lazy => $('../package.json').version,
    _compiler: require('@sap/cds-compiler'),  //> for lsp only

});

// Adding global forwards to cds.ql
[ 'SELECT', 'INSERT', 'UPDATE', 'DELETE', 'CREATE', 'DROP' ] .forEach (
    p => Reflect.defineProperty (global,p, {get:()=> cds.ql[p], configurable:1})
);

// Adding delegates to absent primary datasource
[ 'model', 'entities', 'transaction', 'run', 'stream', 'foreach', 'read', 'insert', 'update', 'delete' ] .forEach (
    p => cds[p] = lazy => { throw new Error (`'cds.${lazy}' used without prior cds.connect().`) }
);

cds.lazify()
