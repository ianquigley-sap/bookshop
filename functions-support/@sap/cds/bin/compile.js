module.exports = Object.assign ( compile, {
  options: [
    '--from', '--service', '--lang', '--unfold', '--for', '--to', '--dest', '--args'
  ],
  flags: [
    '--all', '--beta'
  ],
  shortcuts: [
    '-f', '-s', '-l', '-u', '-4', '-2', '-o', '-a'
  ],
  help: `
# SYNOPSIS

    *cds compile* [<models>] [<options>]

    Compiles the specified models, optionally applying specific processors to
    unfold and generate target outputs using the <options> as explained below.
    Reads from stdin if no <models> are specified.


# OPTIONS
    ${
        // *-f, --from* <frontend>

        //     use the specified frontend to parse the input. <frontend> can be one of
        //     the built-in parsers like *cdl* or *yaml*
        //     valid node module ids of custom parsers.
     ''}
    *-s* | *--service* <name> | all

        chooses a specific service in case of models containing multiple ones.
        Specify _all_ to force output for all services.

    *-l* | *--lang* <languages> | all

        localize the model with given <languages>, a comma-separated list
        of language/locale codes or _all_. Localization is carried out before
        all other processors (-4/u) or backends (-2).

    *-u* | *--unfold* <processors> | all

        apply the specified <processors>, a comma-separated list of either
        built-in ones or valid node
        module ids of custom-provided ones.

    *-4* | *--for* <target>

        shortcut for --unfold for.<target>; e.g. these usages are equivalent:
        cds compile my-model --unfold for.odata
        cds compile my-model -4 odata

    *-2* | *--to* <backends>

        use the specified <backends>, a comma-separated list of either
        built-in ones like _yaml_ or _edmx_
        or valid node module ids of custom backends.

    *-a* | *--args* <arguments>

        optional named arguments for processors or backends.
        Specify as \`--args name1=value1,name2=value2\`

    *-o* | *--dest* <folder>

        writes output to the given folder instead of stdout.

# EXAMPLES

   *cds* compile model.cds
   *cds* c model.json --to cdl
   *cds* srv -s all -l all -2 edmx -o _out

   Use cds as shell command that reads from stdin and writes to stdout:
   *cat* hy | *cds* -2 sql | *sqlite3* test.db

`})

function compile_all (root='.') {

    const {exec} = require ('child_process')
    const cds = require ('../lib/cds')

    exec(`find ${root} -name *.cds ! -path '*/node_modules/*'`, (_,stdout)=>{
        const all = stdout.split('\n').slice(0,-1)
        const info = `\n/ compiled ${all.length} cds models in`
        console.log (`Compiling ${all.length} cds models found in ${process.cwd()}...\n`)
        console.time (info)
        return Promise.all (all.map (each => cds.load(each)
            .then (()=> console.log (' ',each))
            .catch (()=> console.log (' \x1b[91m', each, '\x1b[0m'))
        )).then (()=>
            console.timeEnd (info)
        )
    })

}

function compile (models, options={}) {

    if (options.all)  return compile_all (models[0])

    const cds = require ('../lib/cds')
    let chain, src, _suffix; //> be filled in below
    if (!options.as && !/,/.test(options.to))  options.as = 'str'
    if (options.beta)  options.betaMode = true

    if (typeof models === 'string')  models = [models]
    if (Array.isArray(models) && models.length > 0) {  // any arguments?
        chain = cds.load (models, options)
        src = models[0] .replace (/\.[^.]+$/,'')       //> excluding source file extension, e.g. .cds
    } else if (!process.stdin.isTTY && process.argv[1].endsWith('cds')) {  // else check for stdin
        chain = readModelFromStdin()
        src = 'stdin'
    } else { // no args, no stdin
        return Promise.reject ('You must specify a model to compile!')
    }
    const processorOptions = addProcessorArgs(options)

    if (options.unfold) for (let each of options.unfold.split(',')) {
        chain = chain.then (next (processor4 (cds.compile.for, each)))
    }
    if (options.for) {
        chain = chain.then (next (processor4 (cds.compile.for, options.for)))
    }
    if (options.lang) {
        chain = chain.then (m => cds.localize (m,options.lang.split(',')))
    }
    if (options.to) for (let each of options.to.split(',')) {
        chain = chain.then (next (processor4 (cds.compile.to, _suffix=each)))
    }

    return chain.then (cds.write.to ({
        folder: options.dest,
        file: options.file || src,
        suffix: options.suffix || suffix4(_suffix),
        [options.dest ? 'foreach' : 'log']: options.log || consoleLog
    }))

    function processor4 (head, tail) {
        try {
            let proc = tail.split('.').reduce ((prev,next) => prev[next], head)
            if (proc)  return proc
        } catch(e){/* ignore */}
        throw `    unknown model processor: ${tail}`
    }

    function next (proc) {
        return (prev) => function*(){
            if (isSingle(prev))  yield [ proc(prev,processorOptions) ]
            else for (let [outer,_outer] of prev) {
                let next = proc (outer, processorOptions)
                if (isSingle(next)) yield [ next, _outer ]
                else for (let [inner,_inner] of next) {
                    yield [ inner, Object.assign({},_outer,_inner) ]
                }
            }
        }()
        function isSingle (outcome) {
            return !(outcome[Symbol.iterator] && outcome.next)
        }
    }

    function readModelFromStdin(){
        return new Promise ((_resolved, _error) => {
            let src=""; process.stdin
            .on ('data', chunk => src += chunk)
            .on ('end', ()=> _resolved (src[0] === '{' ? JSON.parse(src) : cds.parse(src)))
            .on ('error', _error)
        })
    }

    function consoleLog(o) {
        const {colors} = require('./utils/term')
        return (typeof o === 'string')
            ? console.log (o) // don't try to inspect strings
            : console.dir (o, {colors, depth: 111, /*since node v10*/compact: false})
    }

}

function addProcessorArgs(options) {
    const procArgs = {}
    if (!options.args)  return options
    options.args.split(',').forEach(arg => {
        const keyValue = arg.split('=')
        if (keyValue.length < 2)  throw new Error(`Argument '${arg}' must be prefixed with <name>=`)
        procArgs[keyValue[0]] = keyValue[1]
        delete options[arg]
    })
    return Object.assign(procArgs, options)
}

function suffix4 (x) { return x && ({
    edmx: '.xml',
    swgr: '.yml',
    cdl: '.cds',
    ddl: '.sql',
    sql: '.sql',
    edm: '.json'
}[x] || '.'+x) }

/* eslint no-console:0 */
