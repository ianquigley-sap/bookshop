const fs = require('fs-extra')
const path = require('path')
const BuildTaskHandler = require('../buildTaskHandler')
const term = require('../../utils/term')
const MtaUtil = require('../mtaUtil')
const {OUTPUT_MODE_PREVIEW, OUTPUT_MODE_DEFAULT} = require('../../../lib/build/constants')

const DEBUG = process.env.DEBUG
const GENERATED_SOURCES_FOLDER = path.join("src", "gen")

const FILE_CONTENT_HDINAMESPACE = {
    "name": "",
    "subfolder": "ignore"
}

const FILE_EXT_CDS = ".cds"
const FILE_EXT_CSV = ".csv"
const FILE_EXT_HDBTABLEDATA = ".hdbtabledata"
const FILE_EXT_HDBCDS = ".hdbcds"

const FILE_NAME_HDICONFIG = ".hdiconfig"
const FILE_NAME_HDINAMESPACE = ".hdinamespace"
const FILE_NAME_PACKAGE_JSON = "package.json"
const FILE_NAME_MANIFEST_YAML = "manifest.yaml"

class HanaModuleBuilder extends BuildTaskHandler {
    constructor(task, buildOptions) {
        super("Hana DB Module Builder", task, buildOptions)
        this._result = {
            dest: this.task.dest,
            hdbcds: []
        }
    }

    async build() {
        const { src, dest } = this.task

        const modelPaths = this._resolveModel()

        this.logger.log(`\n[cds] - building module [${this._stripProjectPaths(src)}] using [${this.name}]`)

        if (!modelPaths || modelPaths.length === 0) {
            this.logger.log("[cds] - no model found, skip build")
            return this._result
        }

        this.logger.log(`[cds] - model: ${this._stripProjectPaths(modelPaths).join(", ")}`)

        const promises = [
            this._compilePersistenceModel(modelPaths, dest)
        ]

        if (this.outputMode === OUTPUT_MODE_DEFAULT || this.outputMode === OUTPUT_MODE_PREVIEW) {
            promises.push(this._copyNativeContent(src, dest))
            promises.push(this._writeHdiConfig(src, dest))
            promises.push(this._writeHdiNamespace(dest))
            if(!this.task.options.skipPackageJsonGeneration) {
                promises.push(this._writePackageJson(src, dest))
            }
            if(!this.task.options.skipManifestGeneration) {
                promises.push(this._writeManifestYaml())
            }
        }

        await Promise.all(promises)

        return this._result
    }

    async clean() {
        const srcGenDir = path.join(this.task.src, GENERATED_SOURCES_FOLDER)

        if (!this._isStagingBuild()) {
            return fs.remove(srcGenDir)
        } else {
            return Promise.all([
                fs.remove(srcGenDir), // make sure a gen folder created by an inplace build will be deleted
                super.clean()
            ])
        }
    }

    async _copyNativeContent(src, dest) {
        const dbSrcDir = path.join(src, "src")

        // 1. copy '.csv' files located in 'db/src/**' to '<target>/db/src/**'
        // 2. copy '.csv' files located in 'db' to 'db/src
        return super._copyNativeContent(src, dest, (entry) => {
            const extname = path.extname(entry)
            return (fs.statSync(entry).isDirectory() && path.dirname(entry) !== dest) ||
                (extname !== FILE_EXT_CSV && extname !== FILE_EXT_HDBTABLEDATA && extname !== FILE_EXT_CDS && entry !== this.cds.env.build.outputfile) ||
                ((extname === FILE_EXT_CSV || extname === FILE_EXT_HDBTABLEDATA) && entry.startsWith(dbSrcDir))
        }).then(() => {
            // handle .csv and .hdbtabledata
            const files = BuildTaskHandler._find(src, (entry) => {
                if (fs.statSync(entry).isDirectory()) {
                    return true
                }

                const extname = path.extname(entry)
                return (extname === FILE_EXT_CSV || extname === FILE_EXT_HDBTABLEDATA) && !entry.startsWith(dbSrcDir)
            })
            return Promise.all(files.map((file) => {
                return this.copy(file).to(path.join(dest, GENERATED_SOURCES_FOLDER, path.relative(src, file)))
            }))
        })
    }

    async _compilePersistenceModel(modelPaths, dest) {
        const model = await this.cds.load(modelPaths)
        const promises = []

        // .hdbcds files
        for (let [each, {
            name
        }] of this.cds.compile.to.hana(model)) {
            const relativeDestinationPath = path.join(GENERATED_SOURCES_FOLDER, name + FILE_EXT_HDBCDS)
            this._result.hdbcds.push(relativeDestinationPath)
            const destinationPath = path.join(dest, relativeDestinationPath)
            if (this.outputMode === OUTPUT_MODE_DEFAULT || this.outputMode === OUTPUT_MODE_PREVIEW) {
                promises.push(this.write(each).to(destinationPath))
            }
        }

        await Promise.all(promises)
    }

    async _writePackageJson(src, dest) {
        const packageJson = path.join(src, "package.json")
        const exists = await fs.exists(packageJson)

        if (DEBUG && exists) {
            this.logger.log(`[cds] - skip create [${this._stripProjectPaths(packageJson)}], already existing`)
        }
        if (this._isStagingBuild() && !exists) {
            const content = await this._readTemplateAsJson(path.join("db", "hana", FILE_NAME_PACKAGE_JSON))
            if (content && content.scripts && content.scripts.postinstall) {
                // postinstall hook not required in staging build
                delete content.scripts.postinstall
            }

            await this.write(content).to(path.join(dest, FILE_NAME_PACKAGE_JSON))
        }
    }

    async _writeHdiConfig(src, dest) {
        const hdiConfig = path.join(src, "src", ".hdiconfig")
        const exists = await fs.exists(hdiConfig)

        if (DEBUG && exists) {
            this.logger.log(`[cds] - skip create [${this._stripProjectPaths(hdiConfig)}], already existing`)
        }
        if (this._isStagingBuild() && !exists) {
            const content = await this._readTemplateAsJson(path.join("db", "hana", "src", FILE_NAME_HDICONFIG))
            await this.write(content).to(path.join(dest, "src", FILE_NAME_HDICONFIG))
        }
    }

    async _writeHdiNamespace(dest) {
        // see issue #64 - add .hdinamespace file to prevent HDI from adding gen/ folder to the namespace.
        return this.write(FILE_CONTENT_HDINAMESPACE).to(path.join(dest, GENERATED_SOURCES_FOLDER, FILE_NAME_HDINAMESPACE))
    }

    async _writeManifestYaml() {
        if (!this._isStagingBuild()) {
            return
        }
        if (this._existsManifestYaml()) {
            if (DEBUG) {
                this.logger.log(`[cds] - skip creating [manifest.yaml], already existing`)
            }
            return
        }
        const { root } = this.buildOptions
        const { src } = this.task

        const [hdiServiceName, applicationName] = await Promise.all([
            MtaUtil.getHdiServiceName(root, src, this.logger),
            MtaUtil.getApplicationName(root, src, "hdb", this.logger)
        ])

        const MANIFEST_YAML_CONTENT = `---
applications:
- name: ${applicationName}
  random-route: true
  health-check-type: none
  services:
  - ${hdiServiceName}`

        this.logger.log("Cloud Foundry service binding required for HDI container.")
        this.logger.log("To create a service use CF command")
        this.logger.log("")
        this.logger.log(term.info(`  cf cs hana hdi-shared ${hdiServiceName}`))
        this.logger.log("")

        await this.write(MANIFEST_YAML_CONTENT).to(path.join(this.task.dest, FILE_NAME_MANIFEST_YAML))
    }

    _existsManifestYaml() {
        return fs.existsSync(path.join(this.buildOptions.root, FILE_NAME_MANIFEST_YAML)) || fs.existsSync(path.join(this.task.src, FILE_NAME_MANIFEST_YAML))
    }

    async _readTemplateAsJson(relTemplatePath) {
        const cdsGen = require("@sap/generator-cds")
        const templatePath = path.join(cdsGen.templatePath, relTemplatePath)

        return fs.readJSON(templatePath).catch((error) => {
            this.logger.error(`Failed to read cds generator template [${templatePath}]`)
            return Promise.reject(error)
        })
    }
}
module.exports = HanaModuleBuilder
