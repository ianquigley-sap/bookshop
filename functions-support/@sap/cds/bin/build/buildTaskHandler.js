const fs = require('fs-extra')
const path = require('path')
const {OUTPUT_MODE_DEFAULT, OUTPUT_MODE_PREVIEW} = require('../../lib/build/constants')

class BuildTaskHandler {
    constructor(name, task, buildOptions) {
        task.options = task.options || {}

        this._name = name
        this._task = task
        this._buildOptions = buildOptions || {}
        this._written = []
        this._buildOptions.outputMode = this._buildOptions.outputMode || OUTPUT_MODE_DEFAULT
    }

    get name() {
        return this._name;
    }
    get logger() {
        return this._logger;
    }
    set logger(logger) {
        this._logger = logger;
    }
    set cds(cds) {
        this._cds = cds;
    }
    get cds() {
        return this._cds
    }
    get env() {
        return this._cds.env
    }
    get task() {
        return this._task
    }
    get buildOptions() {
        return this._buildOptions
    }
    get outputMode() {
        return this._buildOptions.outputMode
    }
    get written() {
        return this._written
    }

    init() { }

    async build() {
        return Promise.resolve()
    }

    async clean() {
        if (!this._isStagingBuild()) {
            return Promise.resolve()
        }
        return fs.remove(this.task.dest)
    }

    write(data) {
        return {
            to: async (dest) => {
                if (this.outputMode === OUTPUT_MODE_DEFAULT || this.outputMode === OUTPUT_MODE_PREVIEW) {
                    this._written.push(dest)
                    if (this.outputMode === OUTPUT_MODE_DEFAULT) {
                        await fs.outputFile(dest, typeof data === "object" ? JSON.stringify(data, null, 2) : data)
                    }
                }
            }
        }
    }

    copy(source) {
        return {
            to: async (dest) => {
                if (this.outputMode === OUTPUT_MODE_DEFAULT || this.outputMode === OUTPUT_MODE_PREVIEW) {
                    this._written.push(dest)
                    if (this.outputMode === OUTPUT_MODE_DEFAULT) {
                        await fs.copy(source, dest)
                    }
                }
            }
        }
    }

    /**
     * Returns whether the currently executed build represents a staging build or not.
     * A build is referred to as staging build if either the build.target is set to some directory other than '.'
     * or if task.dest is not a sub-directory of the task's source directory (task.src)
     */
    _isStagingBuild() {
        return this.task.src !== (this.task.dest || this.task.src)
    }

    _resolveModel() {
        return this.cds.resolve((this.task.options && this.task.options.model) || this.task.src, this.buildOptions)
    }

    async _copyNativeContent(srcDir, destDir, filter) {
        if (!this._isStagingBuild()) {
            return Promise.resolve()
        }
        const targetDir = path.resolve(this.buildOptions.root, this.cds.env.build.target)

        const files = BuildTaskHandler._find(srcDir, (src) => {
            // do not copy files that:
            // - are contained in the 'cds.env.build.target' folder
            // - are contained in this modules 'dest' folder
            // - do not fullfill additional specific filter criteria

            // node_modules folder has to be copied to staging directory
            //const regex = new RegExp("\\" + path.sep + "node_modules\\" + path.sep)

            return (typeof src === "string" && src !== targetDir && src !== destDir /* && !src.match(regex) */ && (!filter || filter.call(this, src)))
        })

        return Promise.all(
            files.map((srcFile) => {
                let relFile = path.relative(srcDir, srcFile)
                let destFile = path.join(destDir, relFile)
                return this.copy(srcFile).to(destFile)
            })
        )
    }

    // Returning the project relative path representation of the given path(s),
    _stripProjectPaths(qualifiedPaths) {
        if (typeof qualifiedPaths === "string") {
            return path.relative(this.buildOptions.root, qualifiedPaths)
        } else if (Array.isArray(qualifiedPaths)) {
            return qualifiedPaths.map(qualifiedPath => path.relative(this.buildOptions.root, qualifiedPath))
        }

        return qualifiedPaths
    }

    static _find(sourceDir, filter) {
        const files = []
        BuildTaskHandler._traverseFileSystem(sourceDir, files, filter)

        return files;
    }

    static _traverseFileSystem(sourceDir, files, filter) {
        fs.readdirSync(sourceDir).map((subDirEntry) => path.join(sourceDir, subDirEntry)).forEach((entry) => {
            var stats = fs.statSync(entry)
            if (stats.isDirectory() && (!filter || filter.call(this, entry))) {
                BuildTaskHandler._traverseFileSystem(entry, files, filter)
            }
            if (stats.isFile() && (!filter || filter.call(this, entry))) {
                files.push(entry)
            }
        })
    }
}

module.exports = BuildTaskHandler