
const fs = require('fs-extra')
const path = require('path')
const _cds = require('../../lib/cds')
const BuildTaskHandler = require('./buildTaskHandler')
const MtaUtil = require('./mtaUtil')
const { BUILD_TASK_HANA, BUILD_TASK_FIORI, BUILD_TASK_JAVA, BUILD_TASK_NODE, CDS_CONFIG_PATH_SEP } = require("../../lib/build/constants");

const DEBUG = process.env.DEBUG
const FILE_NAME_MTA_YAML = "mta.yaml"

class BuildTaskFactory {
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

    // the following order for determining build tasks is used
    // 1. create from commandline input, e.g. cds build/all --for hana --src db --model srv --dest db
    // 2. read using cds.env.build.tasks
    // 3. create from mta.yaml
    // 4. create from cds.env.folders config data
    async getTasks(buildOptions) {
        let tasks = this._getExistingTasks()
        if (tasks.length === 0) {
            tasks = await this._createTasksFromConfig(buildOptions.root)

            if (tasks.length > 0) {
                let tasksOutput = "{\n  \"build\": {\n    \"target\": \".\",\n    \"tasks\": ["
                for (let i = 0; i < tasks.length; i++) {
                    tasksOutput += "\n      " + JSON.stringify(tasks[i]) + (i + 1 < tasks.length ? "," : "")
                }
                tasksOutput += "\n    ]\n  }\n}\n"

                // TODO - should the build really switch to inplace mode in that case?
                this.env.build.mode = "inplace"
                this.env.build.target = "."

                this.logger.log(`[cds] - No CDS custom build tasks defined for project [${buildOptions.root}].`)
                this.logger.log("[cds] - The following build tasks have been auto-created and will be executed.")
                this.logger.log("[cds] - You may want to add the following contents to the ./.cdsrc.json of your project and customize to your needs if required.")
                this.logger.log(tasksOutput)
            }
        }

        return tasks
    }

    _getExistingTasks() {
        if (Array.isArray(this.env.build.tasks)) {
            return this.env.build.tasks
        }
        return []
    }

    async _createTasksFromConfig(projectPath) {
        let tasks = await this._createTasksFromMtaYaml(projectPath)

        if (tasks.length === 0) {
            tasks = this._createTasksFromCdsConfig(projectPath)
        }
        return tasks
    }

    async _createTasksFromMtaYaml(projectPath) {
        const tasks = []
        const mtaFilePath = path.join(projectPath, FILE_NAME_MTA_YAML)

        if (!fs.existsSync(mtaFilePath)) {
            if (DEBUG) {
                this.logger.log("[cds] - No [mta.yaml] file found")
            }
            return tasks
        }

        this.logger.log("[cds] - Determining CDS build tasks from [mta.yaml]")

        const modules = await MtaUtil.findModules(projectPath, this.logger)

        if (modules.length === 0) {
            this.logger.log("[cds] - No module definitions found in [mta.yaml]")
            return tasks
        }

        modules.forEach(module => {
            const task = this._createTaskFromYamlModule(projectPath, module)
            if (task) {
                tasks.push(task)
            }
        })

        // update model paths
        const fioriAppModelPaths = this._getFioriAppModelPaths(projectPath, tasks)
        const dbModelPaths = tasks.filter(task => task.for === BUILD_TASK_HANA).map(hanaTask => hanaTask.src)

        tasks.forEach(task => {
            switch (task.for) {
                case BUILD_TASK_FIORI:
                case BUILD_TASK_HANA:
                    // add the service module to the fiori build tasks as the services are loaded during build
                    tasks.forEach(curTask => {
                        // add the service module folders to the hana build tasks
                        if (curTask.for === BUILD_TASK_JAVA || curTask.for === BUILD_TASK_NODE) {
                            task.options.model.push(curTask.src)
                        }
                    })
                    break

                case BUILD_TASK_NODE:
                case BUILD_TASK_JAVA:
                    // add the fiori and db module folders to the service build tasks
                    task.options.model = task.options.model.concat(dbModelPaths, fioriAppModelPaths)
                    break
            }
        })

        return tasks
    }

    _createTaskFromYamlModule(projectPath, module) {
        const types = {
            hdb: BUILD_TASK_HANA,
            nodejs: BUILD_TASK_NODE,
            java: BUILD_TASK_JAVA,
            html5: BUILD_TASK_FIORI
        }
        let task

        if (types[module.type] && typeof module.path) {
            const modelPaths = this._resolve(path.resolve(projectPath, module.path))

            switch (types[module.type]) {
                case BUILD_TASK_NODE:
                    // skip module for cds build if it does not contain .cds files, but make sure we are adding the default ones
                    if (module.path === "db" || module.path === "srv" || modelPaths.length > 0) {
                        task = {
                            src: module.path,
                            for: types[module.type],
                            options: {
                                model: [module.path]
                            }
                        }
                        // there is no specific module type for db modules using hdi-dynamic deploy
                        if (module.path === "db") {
                            this.logger.log(`[cds] - Assuming module [${module.name}] is of type [hdb] - using build task for [${BUILD_TASK_HANA}] instead of [${BUILD_TASK_NODE}]`) //NOSONAR
                            task.for = BUILD_TASK_HANA
                        }
                    }
                    break

                case BUILD_TASK_JAVA:
                    // skip module for cds build if it does not contain .cds files, but make sure we are adding the default ones
                    if (module.path === "srv" || modelPaths.length > 0) {
                        task = {
                            src: module.path,
                            for: types[module.type],
                            options: {
                                model: [module.path]
                            }
                        }
                    }
                    break

                case BUILD_TASK_HANA:
                    task = {
                        src: module.path,
                        for: types[module.type],
                        options: {
                            model: [module.path]
                        }
                    }
                    break

                case BUILD_TASK_FIORI: {
                    const manifestPath = path.resolve(projectPath, module.path, 'webapp', 'manifest.json')

                    if (fs.existsSync(manifestPath)) {
                        task = {
                            src: module.path,
                            for: types[module.type],
                            options: {
                                model: []
                            }
                        }
                        // add the fiori module folder only if it contains any .cds files
                        if (modelPaths.length > 0) {
                            task.options.model.push(module.path)
                        }
                    } else {
                        this.logger.log(`[cds] - UI module does not contain a manifest.json [${this._stripProjectPaths(manifestPath)}], skipping build`)
                    }
                    break
                }
            }
            if (DEBUG) {
                if (task) {
                    this.logger.log(`[cds] - Creating build task for yaml module definition [${module.name}], type [${module.name}], path [${module.path}]`)
                } else {
                    this.logger.log(`[cds] - Skipping module [${module.name}] of type [${module.type}] - no CDS model found`)
                }
            }
        }

        return task
    }

    _createTasksFromCdsConfig(projectPath) {
        this.logger.log("[cds] - Determining CDS build tasks from CDS configuration - applying defaults")

        // stripping '/' if this is the last character
        let db = typeof this.env.folders.db === "string" ? this.env.folders.db.replace(/\/$/, '') : this.env.folders.db
        let srv = typeof this.env.folders.srv === "string" ? this.env.folders.srv.replace(/\/$/, '') : this.env.folders.srv
        let dbOptionsArray = false
        const dbOptions = {
            model: []
        }
        let srvOptionsArray = false
        const srvOptions = {
            model: []
        }
        const fioriSrvOptions = {
            model: []
        }
        let tasks = []

        if (Array.isArray(db) && db.length > 0) {
            dbOptions.model = db
            // use the first entry as module folder
            db = db[0].split(CDS_CONFIG_PATH_SEP)[0]
            dbOptionsArray = true
        }
        if (Array.isArray(srv) && srv.length > 0) {
            srvOptions.model = srv
            fioriSrvOptions.model = fioriSrvOptions.model.concat(srv)

            // use the first entry as module folder
            srv = srv[0].split(CDS_CONFIG_PATH_SEP)[0]
            srvOptionsArray = true
        }

        if (typeof db !== "string" || !fs.existsSync(path.resolve(projectPath, db))) {
            db = null
        } else {
            if (!dbOptionsArray) {
                dbOptions.model.push(db)
            }
        }
        if (typeof srv !== "string" || !fs.existsSync(path.resolve(projectPath, srv))) {
            srv = null
        } else {
            if (!srvOptionsArray) {
                srvOptions.model.push(srv)
                fioriSrvOptions.model.push(srv)
            }
            if (db !== null) {
                const dataModel = dbOptions.model
                dbOptions.model = dbOptions.model.concat(srvOptions.model)
                srvOptions.model = dataModel.concat(srvOptions.model)
            }
        }

        // requires tag is missing in old cds configs
        if (db) {
            const dbTask = this._createDbTask(db, dbOptions)
            if (dbTask) {
                tasks.push(dbTask)
            }
        }

        if (srv) {
            const srvTask = this._createSrvTask(projectPath, srv, srvOptions)
            if (srvTask) {
                tasks.push(srvTask)
            }

            // add fiori build tasks
            const fioriTasks = this._createFioriTasks(projectPath, fioriSrvOptions)
            if (fioriTasks.length > 0) {
                const appDirs = this._getFioriAppModelPaths(projectPath, fioriTasks)
                srvOptions.model = srvOptions.model.concat(appDirs)
                tasks = tasks.concat(fioriTasks)
            }
        }

        return tasks
    }

    _createDbTask(src, options) {
        this.logger.log("[cds] - Determining database kind.")
        let task = null

        if (!(this.env.requires && this.env.requires.db && this.env.requires.db.kind === "sqlite")) {
            this.logger.log("[cds] - Found HANA database.")

            task = {
                src: src,
                for: BUILD_TASK_HANA,
                options: options
            }
        } else {
            this.logger.log("[cds] - Found sqlite database - skipping HANA build task")
        }

        return task
    }

    _createSrvTask(projectPath, src, options) {
        this.logger.log("[cds] - Determining service module implementation technology")
        let task = null

        // check whether the service is of type java containing a pom.xml file
        const pomXmlFiles = BuildTaskHandler._find(path.resolve(projectPath, src), entry => fs.statSync(entry).isDirectory() || path.basename(entry) === "pom.xml")

        if (pomXmlFiles.length > 0) {
            // check for new java project structure https://sapjira.wdf.sap.corp/browse/XSJT-2207
            // srv
            //   application
            //     pom.xml
            //   integration-tests
            //     pom.xml
            // pom.xml

            this.logger.log("[cds] - Found implementation technology java")

            task = {
                src: src,
                for: BUILD_TASK_JAVA,
                options: options
            }
        } else {
            this.logger.log("[cds] - Found implementation technology node")

            task = {
                src: src,
                for: BUILD_TASK_NODE,
                options: options
            }
        }

        return task
    }

    _createFioriTasks(projectPath, fioriSrvOptions) {
        let tasks = []

        this.logger.log("[cds] - Determining fiori build tasks - matching modules */webapp/manifest.json")

        // fiori-app build-tasks
        let appDirs = this.env.ui && this.env.ui.apps ? this.env.ui.apps : undefined
        if (!appDirs) {
            const DEFAULT_UI_MANIFEST_PATTERNS = [
                "*/webapp/manifest.json" // top-level UI apps  (typical Web IDE layout)
            ]
            let app = typeof this.env.folders.app === "string" ? this.env.folders.app.replace(/\/$/, '') : this.env.folders.app
            if (typeof app === "string") {
                DEFAULT_UI_MANIFEST_PATTERNS.push(path.join(app, "*/webapp/manifest.json"))
            } else if (Array.isArray(app)) {
                app.forEach(entry => DEFAULT_UI_MANIFEST_PATTERNS.push(path.join(entry, "*/webapp/manifest.json")))
            }

            const manifestPaths = this._findFiles(projectPath, DEFAULT_UI_MANIFEST_PATTERNS)

            // use '/' for any cds-config path entries
            appDirs = manifestPaths.map(manifestPath => path.relative(projectPath, manifestPath.split("webapp")[0]).replace(/\\/g, CDS_CONFIG_PATH_SEP))
        }

        this.logger.log(`[cds] - Found fiori app paths [${appDirs}]`)

        appDirs.forEach(appDir => {
            //replace trailing '/'
            appDir = appDir.replace(/\/$/, '')
            let modelPaths = this._resolve(path.resolve(projectPath, appDir))
            const newTask = {
                src: appDir,
                for: "fiori",
                options: {
                    model: fioriSrvOptions.model.concat(modelPaths.length > 0 ? [appDir] : [])
                }
            }
            if (!tasks.find((task) => {
                return task.src === newTask.src && task.for === newTask.for
            })) {
                tasks.push(newTask)
            }
        })

        return tasks
    }

    _getFioriAppModelPaths(projectPath, tasks) {
        const appDirs = []

        tasks.forEach((task) => {
            // the build task is only relevant if it contains an annotations model
            // only in that case options.model is containing an entry <task.src>
            if (task.for === BUILD_TASK_FIORI && task.options.model.find(cur => cur === task.src)) {
                const appRoot = task.src.split(CDS_CONFIG_PATH_SEP)[0]
                let appDir = task.src
                let model = this._resolve(path.resolve(projectPath, appRoot))
                if (model.length > 0) {
                    // appRoot may contain index.cds file
                    appDir = appRoot
                }

                if (appDir && !appDirs.find(cur => cur === appDir)) {
                    appDirs.push(appDir)
                }
            }
        })

        return appDirs
    }

    _resolve(modelPath) {
        let model
        try {
            model = this.cds.resolve(modelPath)
        } catch (e) {
            // silently ignore -> assume no model exists
        }

        return model ? model : []
    }

    _flatten(o, arr = []) {
        if (o) {
            Array.isArray(o) ? o.forEach(e => this._flatten(e, arr)) : arr.push(o)
        }
        return arr
    }

    _strippedPath(p) {
        return p.replace(/^(\/|\\)/, '').replace(/(\/|\\)$/, '') // strip leading and trailing slash or backslash
    }

    _readDirs(dir) {
        if (!fs.existsSync(dir) || !fs.lstatSync(dir).isDirectory()) return []
        return fs.readdirSync(dir)
            .map(f => path.resolve(dir, f))
            .filter(f => fs.lstatSync(f).isDirectory())
    }

    _findFiles(projectPath, patterns) {
        const files = []
        patterns.forEach(pattern => {
            const starIndex = pattern.indexOf('*')
            if (starIndex >= 0) {
                const dir = path.resolve(projectPath, pattern.substring(0, starIndex))
                const subPattern = this._strippedPath(pattern.substring(starIndex + 1, pattern.length)) // '*/foo/bar/' -> 'foo/bar'
                files.push(...this._readDirs(dir).map(subDir => this._findFiles(subDir, [subPattern])))
            } else {
                const file = path.resolve(projectPath, pattern)
                if (fs.existsSync(file)) files.push(file)
            }
        })
        return this._flatten(files)
    }
}

module.exports = BuildTaskFactory
