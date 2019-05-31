const fs = require('fs-extra')
const path = require('path')
const _cds = require('../../lib/cds')
const cli = require('../utils/cli')
const {OUTPUT_MODE_DEFAULT} = require('../../lib/build/constants')

const DEBUG = process.env.DEBUG

class BuildTaskEngine {
    constructor(logger, cds) {
        this._logger = logger || global.console
        this._cds = cds ? cds : _cds
    }

    get cds() {
        return this._cds
    }
    get env() {
        return this._cds.env
    }
    get logger() {
        return this._logger
    }

    async processTasks(tasks, buildOptions, clean = true) {
        const handlers = []
        let buildSuccess = true
        let timerKey = process.stdout.isTTY ? "\x1b[0m" : ""
        timerKey += "[cds] - time"
        this.logger.time(timerKey)

        this.logger.log(`[cds] - building project [${buildOptions.root}], clean [${clean}]`)

        if (DEBUG) {
            this.logger.log("[cds] - cds.env used for build:")
            this.logger.log(JSON.stringify(this.cds.env, null, 1))
        }

        buildOptions = buildOptions || {
            root: process.cwd()
        }
        buildOptions.handlers = handlers

        if (!buildOptions.outputMode) {
            buildOptions.outputMode = OUTPUT_MODE_DEFAULT
        }

        tasks.forEach((task) => {
            try {
                if (task) {
                    const handler = this._createHandler(task, buildOptions)
                    handlers.push(handler)
                }
            } catch (error) {
                // continue
                this.logger.error(`[cds] - ${error}`)
                this.logger.error(error.stack)
                buildSuccess = false
            }
        })

        let buildResult;

        return this._executeCleanBuildTasks(handlers, clean)
            .then(() => {
                return this._executeBuildTasks(handlers)
            }).then(result => {
                buildResult = result
                return this._writeContents(handlers)
            }).then((files) => {
                return this._done(files, buildOptions)
            }).then(() => {
                this.logger.timeEnd(timerKey)

                if (buildSuccess) {
                    return Promise.resolve(buildResult)
                } else {
                    return Promise.reject(`Building project [${buildOptions.root}] failed`)
                }
            }).catch((error) => {
                this.logger.timeEnd(timerKey)
                this.logger.log("")
                this._logError(error)

                throw error
            })
    }

    async _executeCleanBuildTasks(handlers, clean) {
        if (clean) {
            return Promise.all(handlers.map((handler) => {
                if (DEBUG) {
                    this.logger.log("[cds] - clean module")
                    this._logTaskHandler(handler)
                }

                return handler.clean()
            }))
        }
        return Promise.resolve()
    }

    async _executeBuildTasks(handlers) {
        return Promise.all(handlers.map((handler) => {
            if (DEBUG) {
                this.logger.log("[cds] - build module")
                this._logTaskHandler(handler)
            }

            return handler.build()
                .then(handlerResult => {
                    return {
                        task: handler.task,
                        result: handlerResult
                    }
                })
        }))
    }

    async _writeContents(handlers) {
        return Promise.resolve(handlers.reduce((acc, handler) => acc.concat(handler.written), []))
    }

    async _done(files, buildOptions) {
        this.logger.log('\n[cds] - done > wrote output to:')
        const consoleLogs = []

        files.forEach((file) => {
            let relativeFile = path.relative(buildOptions.root, file)
            this.logger.log('  ' + relativeFile)
            consoleLogs.push(relativeFile)
        })

        if (this.cds.env.build.outputfile) {
            this.logger.log(`[cds] - writing generation log to [${this.cds.env.build.outputfile}]`)
            return fs.outputFile(this.cds.env.build.outputfile, consoleLogs.sort().join('\n'))
                .catch((error) => {
                    this.logger.error(`[cds] - failed to write generation log`)
                    this.logger.error(error.stack || error)
                    return Promise.resolve()
                })
        }
        return Promise.resolve()
    }

    _createHandler(task, buildOptions) {
        let resolvedTask = null

        try {
            resolvedTask = this._resolveTask(task, buildOptions)
            let modulePath = null

            if (resolvedTask.use.startsWith("@sap/cds/bin/build")) {
                modulePath = "./" + resolvedTask.use.split("/").pop()
            } else {
                throw new Error(`[cds] - external build plugins are currently not supported, skipping handler [${resolvedTask.use}]`)
            }

            const BuildTaskHandler = require(modulePath)
            if (DEBUG) {
                this.logger.log(`[cds] - loaded BuildTaskHandler [${resolvedTask.use}], module path [${modulePath}]`)
            }
            const handler = new BuildTaskHandler(resolvedTask, buildOptions)
            handler.cds = this.cds
            handler.logger = this.logger
            handler.init()
            if (DEBUG) {
                this.logger.log(`[cds] - created BuildTaskHandler [${resolvedTask.use}]`)
            }
            return handler
        } catch (error) {
            this.logger.error(`[cds] - failed to create BuildTaskHandler [${resolvedTask ? resolvedTask.use : task.use || task.for}]`)
            throw error
        }
    }

    _resolveTask(task, buildOptions) {
        const resolvedTask = Object.assign({}, task)
        resolvedTask.src = path.resolve(buildOptions.root, task.src)
        resolvedTask.dest = path.resolve(buildOptions.root, this.env.build.target, task.dest || task.src)
        resolvedTask.buildOptions = resolvedTask.buildOptions || {}

        if (!resolvedTask.use) {
            if (resolvedTask.for) {
                resolvedTask.use = "@sap/cds/bin/build/" + resolvedTask.for
            } else {
                throw new Error("Invalid build task configuration data - either task.use or task.for definition required")
            }
        } else {
            if (!resolvedTask.for) {
                resolvedTask.for = resolvedTask.use.split("/").pop()
            }
        }
        if (!resolvedTask.for) {
            resolvedTask.for = resolvedTask.use.split("/").pop()
        }

        if (!BuildTaskEngine._existsDir(resolvedTask.src)) {
            throw new Error(`Build task [${resolvedTask.use}] could not be resolved - folder src [${resolvedTask.src}] does not exist`)
        }
        return resolvedTask
    }

    _logTaskHandler(handler) {
        this.logger.log(`[cds] - handler ${handler.name}`)
        this.logger.log(`[cds] - details src [${handler._stripProjectPaths(handler.task.src)}], dest [${handler._stripProjectPaths(handler.task.dest)}], use [${handler.task.use}], options [${JSON.stringify(handler.task.options)}]`) //NOSONAR
    }

    _logError(error) {
        cli.logMessages (/*errors from CDSV*/error.errors || error, this.logger)
    }

    static _existsDir(dir) {
        return fs.existsSync(dir) && fs.lstatSync(dir).isDirectory()
    }
}

module.exports = BuildTaskEngine
