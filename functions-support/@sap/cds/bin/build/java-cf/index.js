const fs = require('fs-extra')
const path = require('path')
const BuildTaskHandler = require('../buildTaskHandler')
const {OUTPUT_MODE_PREVIEW, OUTPUT_MODE_DEFAULT} = require('../../../lib/build/constants')

const GENERATED_SOURCES_FOLDER = path.join("src", "main", "resources", "edmx")

class JavaCfModuleBuilder extends BuildTaskHandler {
    constructor(task, buildOptions) {
        super("Java CF Module Builder", task, buildOptions)
        this._result = {
            dest: task.dest,
            services: new Set(),
            languages: new Set(),
            csn: {},
            edmx: new Map()
        }
    }

    init() {
        // use the location of the pom.xml file as destination
        const pomXmlFiles = BuildTaskHandler._find(this.task.src, entry => fs.statSync(entry).isDirectory() || path.basename(entry) === "pom.xml")
        if (pomXmlFiles.length > 0) {
            pomXmlFiles.sort()
            const srcMainRoot = path.relative(this.task.src, path.dirname(pomXmlFiles[0]))
            this.task.dest = path.resolve(this.task.dest, srcMainRoot)
        }
    }

    async build() {
        const modelPaths = this._resolveModel()

        this.logger.log(`\n[cds] - building module [${this._stripProjectPaths(this.task.src)}] using [${this.name}]`)

        if (!modelPaths || modelPaths.length === 0) {
            this.logger.log(`[cds] - no model found, skip build`)
            return this._result
        }

        this.logger.log(`[cds] - model: ${this._stripProjectPaths(modelPaths).join(", ")}`)

        const model = await this.cds.load(modelPaths)
        const promises = [
            this._compileCsn(model, this.task.dest),
            this._compileEdmx(model, this.task.src, this.task.dest, this.task.options)
        ]

        if (this.outputMode === OUTPUT_MODE_DEFAULT || this.outputMode === OUTPUT_MODE_PREVIEW) {
            promises.push(this._copyNativeContent(this.task.src, this.task.dest))
        }
        await Promise.all(promises)

        return this._result
    }

    async clean() {
        const srcGenDir = path.join(this.task.src, GENERATED_SOURCES_FOLDER)
        const promises = []

        // make sure a gen folder created by an inplace build will be deleted
        if (fs.existsSync(srcGenDir)) {
            promises.push(fs.remove(srcGenDir))
        }

        if (this.task.src !== this.task.dest) {
            promises.push(super.clean())
        }
        return Promise.all(promises)
    }

    async _compileCsn(model, dest) {
        // csn for service providers
        const csn = this.cds.compile.for.odata(model)
        this._result.csn = csn

        if (this.outputMode === OUTPUT_MODE_DEFAULT || this.outputMode === OUTPUT_MODE_PREVIEW) {
            await this.write(csn).to(path.join(dest, GENERATED_SOURCES_FOLDER, 'csn.json'))
        }
    }

    async _compileEdmx(model, src, dest, options) {
        const promises = []
        const locales = this.cds.localize(model, options.lang || ['all'])

        if (locales) {
            for (let [localizedModel, {
                lang
            }] of locales) {
                this._result.languages.add(lang)
                let edmxModels = this.cds.compile.to.edmx(localizedModel, {
                    service: 'all'
                })
                if (edmxModels) {
                    for (let [edmx, {
                        name
                    }] of edmxModels) {
                        const nameWithLocale = name + (lang ? '_' + lang + '.xml' : '.xml')
                        this._result.edmx.set(nameWithLocale, edmx)
                        this._result.services.add(name)

                        if (this.outputMode === OUTPUT_MODE_DEFAULT || this.outputMode === OUTPUT_MODE_PREVIEW) {
                            promises.push(this.write(edmx).to(path.join(dest, GENERATED_SOURCES_FOLDER, nameWithLocale)))
                        }
                    }
                }
            }
        }
        return Promise.all(promises)
    }

    async _copyNativeContent(src, dest) {
        return super._copyNativeContent(src, dest, (entry) => {
            const extname = path.extname(entry)
            return ((fs.statSync(entry).isDirectory() && path.dirname !== dest) || extname !== '.cds')
        })
    }
}
module.exports = JavaCfModuleBuilder
