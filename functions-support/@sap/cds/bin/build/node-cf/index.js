const fs = require('fs-extra')
const path = require('path')
const BuildTaskHandler = require('../buildTaskHandler')
const MtaUtil = require('../mtaUtil')
const {OUTPUT_MODE_PREVIEW, OUTPUT_MODE_DEFAULT} = require('../../../lib/build/constants')

const DEBUG = process.env.DEBUG

const HANA_BUILD_TASK = "hana"

const FILE_NAME_PACKAGE_JSON = "package.json"
const FILE_NAME_MANIFEST_YAML = "manifest.yaml"

class NodeCfModuleBuilder extends BuildTaskHandler {
    constructor(task, buildOptions) {
        super("Node CF Module Builder", task, buildOptions)
        this._result = {
            dest: task.dest,
            csn: {}
        }
    }

    init() {
        if (this._isStagingBuild()) {
            const srcDir = path.relative(this.buildOptions.root, this.task.src)
            this.task.dest = path.resolve(this.task.dest, srcDir)
        }
    }

    async build() {
        // resolve specified models, using all models by default, e.g.
        // { use:'...', src:'srv', options:{model:['app','srv']} }
        // { use:'...', src:'srv' }
        const modelPaths = this._resolveModel()

        this.logger.log(`\n[cds] - building module [${this._stripProjectPaths(this.task.src)}] using [${this.name}]`)

        if (!modelPaths || modelPaths.length === 0) {
            this.logger.log("[cds] - no model found, skip build")
            return this._result
        }

        this.logger.log(`[cds] - model: ${this._stripProjectPaths(modelPaths).join(", ")}`)

        // collect all sources...
        const sources = await this._compileCsn(modelPaths, this.task.src)
        const bundles = this._collectBundles(Object.keys(sources.sources))
        const {
            folders = ['i18n'], file = 'i18n'
        } = this.cds.env.i18n

        const promises = []
        const destGen = this._isStagingBuild() ? this.task.dest : path.join(this.task.dest, 'gen')

        this._result.csn = sources

        if (this.outputMode === OUTPUT_MODE_DEFAULT || this.outputMode === OUTPUT_MODE_PREVIEW) {
            promises.push(this.write(sources).to(path.join(destGen, 'csn.json')))
            promises.push(this._copyNativeContent(this.task.src, this.task.dest))

            if(!this.task.options.skipPackageJsonGeneration) {
                promises.push(this._writePackageJson(this.buildOptions.root, this.task.dest))
            }
            if(!this.task.options.skipManifestGeneration) {
                promises.push(this._writeManifestYaml())
            }

            if (Object.keys(bundles).length > 0) {
                promises.push(this.write(bundles).to(path.join(destGen, folders[0], file + '.json')))
            }
        }
        await Promise.all(promises)

        return this._result
    }

    async clean() {
        const genDir = path.join(this.task.src, "gen")
        const promises = []

        // make sure a gen folder created by an inplace build will be deleted
        if (fs.existsSync(genDir)) {
            promises.push(fs.remove(genDir))
        }

        if (this._isStagingBuild()) {
            promises.push(super.clean())
        }
        return Promise.all(promises)
    }

    async _compileCsn(modelPaths, src) {
        const cdsv = require('../../../lib/models/cdsv')

        await this.cds.load(modelPaths)
        const sources = await cdsv.collectSources(modelPaths, path.relative(process.cwd(), src))
        // remember the src --> used in cds.load()
        sources.srv = src
        return sources
    }

    async _copyNativeContent(src, dest) {
        return super._copyNativeContent(src, dest, (entry) => {
            const extname = path.extname(entry)
            const basename = path.basename(entry)

            return ((fs.statSync(entry).isDirectory() && path.dirname !== dest) || (extname !== '.cds' && basename !== FILE_NAME_PACKAGE_JSON))
        })
    }

    async _writePackageJson(projectRoot, dest) {
        if (this._isStagingBuild()) {
            const packageJsonDest = path.join(path.dirname(dest), FILE_NAME_PACKAGE_JSON)
            const packageJsonSrc = path.join(projectRoot, FILE_NAME_PACKAGE_JSON)
            await this.copy(packageJsonSrc).to(packageJsonDest)
        }
    }

    async _writeManifestYaml() {
        if (!this._isStagingBuild()) {
            return
        }
        if (this._existsManifestYaml()) {
            if (DEBUG) {
                this.logger.log(`[cds] - skip create [manifest.yaml], already existing`)
            }
            return
        }

        // check whether we a hdi service binding is required
        const [hanaBuilder] = this.buildOptions.handlers.filter(handler => handler.task.for === HANA_BUILD_TASK)
        if (!hanaBuilder) {
            this.logger.log("[cds] - skip creating [manifest.yaml] - no build task [hana] existing")
            return
        }

        const { root } = this.buildOptions
        const dbModuleName = path.relative(root, hanaBuilder.task.src)

        const [hdiServiceName, applicationName] = await Promise.all([
            MtaUtil.getHdiServiceName(root, dbModuleName, this.logger),
            MtaUtil.getApplicationName(root, this.task.src, "nodejs", this.logger)
        ])

        const MANIFEST_YAML_CONTENT = `---
applications:
- name: ${applicationName}
  services:
  - ${hdiServiceName}`

        await this.write(MANIFEST_YAML_CONTENT).to(path.join(path.dirname(this.task.dest), FILE_NAME_MANIFEST_YAML))
    }

    _existsManifestYaml() {
        return fs.existsSync(path.join(this.buildOptions.root, FILE_NAME_MANIFEST_YAML)) || fs.existsSync(path.join(this.task.src, FILE_NAME_MANIFEST_YAML))
    }

    _collectBundles(sources) {
        // collect effective i18n properties...
        let bundles = {}
        const bundleGenerator = this.cds.localize.bundles4({
            _sources: sources
        })

        if (typeof bundleGenerator === "object" && bundleGenerator.next) {
            for (let [locale, bundle] of bundleGenerator) {
                // fallback bundle has the name ""
                if (typeof locale === 'string') {
                    bundles[locale] = bundle
                }
            }
        }

        // omit bundles in case the fallback bundle is the only existing entry
        const keys = Object.keys(bundles)
        if (keys.length === 1 && keys[0] === "" && Object.keys(bundles[keys[0]]).length === 0) {
            bundles = {}
        }

        return bundles
    }
}

module.exports = NodeCfModuleBuilder
