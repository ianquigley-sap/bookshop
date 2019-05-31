const _cds = require('../../lib/cds')

module.exports = Object.assign(build, {
    options: ['--project', '--for', '--use', '--src', '--dest', '--options-model'],
    flags: ['--clean'],
    shortcuts: ['-in', '4', '', '', '-o'],
    help: `
# SYNOPSIS

    *cds build* [<options>]

    Builds the modules by compiling contained cds sources.
    The modules are folders in the project root.
    Cleaning the build target is always performed before actual build starts,
    the --clean option has been deprecated.


# OPTIONS

    *-in* | *--project* <folder>

        use the specified folder as the project root.
        default = current working directory ./

    *-4* | *--for* <target>

        alias used to build the source, e.g. hana -> @sap/cds/build/hana.

    *--use* <module>

       fully qualified name of the npm module used to build the source.
       In the current version external build plugins are not supported.

    *--src*

        source folder used as build input

    *-o*  | *--dest* <folder>

        writes output to the given folder of the project root directory.
        default = ${_cds.env.build.target}

    *--options-<name>

        any build plugin specific options that need to be passed,
        e.g. options-model db, srv.


# EXAMPLES

   *cds* build/all
   *cds* build/all -o _out
   *cds* build/all --for hana --src db --model srv --dest db
   *cds* build/all --use @sap/cds/build/hana --src db --dest db --options-model db, srv
`
})

async function build([project], cmdOptions = {}, /* for unit tests only: */ _env = null) {
    const path = require('path')
    const fs = require('fs-extra')
    const BuildTaskEngine = require('./buildTaskEngine')
    const BuildTaskFactory = require('./buildTaskFactory')

    if (!project) {
        project = cmdOptions.project
    }

    const logger = cmdOptions.logger || global.console
    const projectPath = path.resolve(project || '.')

    if (!fs.lstatSync(projectPath).isDirectory()) {
        return Promise.reject(`Project [${projectPath}] does not exist`)
    }

    const cds = _cds.in(projectPath)
    if (_env) {
        cds.env = cds.env.merge(cds.env, _env)
    }

    const info = require('../version').get()
    logger.log(`\n[cds] - cds [${info['@sap/cds']}], compiler [${info['@sap/cds-compiler']}], home [${info.home}]\n`)

    const buildOptions = {
        root: projectPath
    }

    if (cds.env.build.mode === "inplace") {
        cds.env.build.target = "."
    }

    let tasks

    // check for dedicated module build
    if (cmdOptions.for || cmdOptions.use) {
        const task = _createTaskFromCommandLine(cmdOptions)
        tasks = task ? [task] : []
    } else {
        tasks = await new BuildTaskFactory(logger, cds).getTasks(buildOptions)
    }

    return new BuildTaskEngine(logger, cds).processTasks(tasks, buildOptions)
        .catch(() => Promise.reject(`Building project [${buildOptions.root}] failed`))
        .then(() => Promise.resolve())
}

function _createTaskFromCommandLine(cmdOptions) {
    let task = null

    // check for dedicated module build
    if (cmdOptions.for || cmdOptions.use) {
        // TODO generic command-line options -> JSON mapping
        let model
        if (Array.isArray(cmdOptions["options-model"])) {
            model = cmdOptions["options-model"]
        } else if (typeof cmdOptions["options-model"] === "string") {
            model = cmdOptions["options-model"].split(",").map((entry) => entry.trim())
        }

        task = {
            "src": cmdOptions["src"],
            "options": {}
        }

        if (cmdOptions["for"]) {
            task.for = cmdOptions["for"]
        }
        if (cmdOptions["use"]) {
            task.use = cmdOptions["use"]
        }
        if (cmdOptions["dest"]) {
            task.dest = cmdOptions["dest"]
        }
        if (model) {
            task.options.model = model
        }
    }
    return task
}