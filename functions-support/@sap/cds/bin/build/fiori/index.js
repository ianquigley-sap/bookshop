const fs = require('fs-extra')
const path = require('path')
const BuildTaskHandler = require('../buildTaskHandler')
const URL = require('url')
const {OUTPUT_MODE_PREVIEW, OUTPUT_MODE_DEFAULT} = require('../../../lib/build/constants')

class FioriAppModuleBuilder extends BuildTaskHandler {
    constructor(task, buildOptions) {
        super("Fiori UI Module Builder", task, buildOptions)
    }

    /**
     * This version only creates a odata representation for the 'mainService' data source
     * as defined by the fiori wizard - everything else is currently not supported.
     * Therefore errors are only logged, the build does not fail in case a the service
     * cannot be resolved based on the defined service URI
     */
    async build() {
        const { src, dest } = this.task

        const modelPaths = this._resolveModel()

        this.logger.log(`\n[cds] - building module [${this._stripProjectPaths(src)}] using [${this.name}]`)

        if (!modelPaths || modelPaths.length === 0) {
            this.logger.log(`[cds] - no model found`)
            return
        }

        this.logger.log(`[cds] - model: ${this._stripProjectPaths(modelPaths).join(", ")}`)

        const model = await this.cds.load(modelPaths)

        const promises = [this._compileEdmx(model, src, dest)]
        if (this.outputMode === OUTPUT_MODE_DEFAULT || this.outputMode === OUTPUT_MODE_PREVIEW) {
            promises.push(this._copyNativeContent(src, dest))
        }

        await Promise.all(promises)
    }

    async _copyNativeContent(src, dest) {
        return super._copyNativeContent(src, dest, (entry) => {
            const extname = path.extname(entry)
            return ((fs.statSync(entry).isDirectory() && path.dirname !== dest) || extname !== '.cds')
        })
    }

    async _compileEdmx(model, src, dest) {
        const manifestPath = path.join(src, 'webapp', 'manifest.json')
        let manifest

        try {
            manifest = require(manifestPath)
        } catch (error) {
            this.logger.log(`[cds] - UI module does not contain a manifest.json [${this._stripProjectPaths(manifestPath)}], skipping build`)
            return
        }

        const mainService = this._property(manifest, 'sap.app', 'dataSources', 'mainService')
        if (!mainService) {
            // no mainService defined - not supported
            this.logger.log(`[cds] - UI module does not contain a mainService [${this._stripProjectPaths(manifestPath)}], skipping build`)
            return
        }

        const localUri = this._property(mainService, 'settings', 'localUri')
        const uri = mainService.uri

        if (localUri && uri) {
            try {
                const edmx = this._compileEdmxForUri(model, uri)
                const edmxPath = path.resolve(path.join(dest, 'webapp'), this._strippedUrlPath(localUri))

                if (this.outputMode === OUTPUT_MODE_DEFAULT || this.outputMode === OUTPUT_MODE_PREVIEW) {
                    await this.write(edmx).to(edmxPath)
                }
            } catch (error) {
                this.logger.log(`[cds] - failed to compile edmx representation for service uri ${uri}, data source [mainService]`)
                this.logger.log(error.stack)
            }
        } else {
            this.logger.log(`[cds] - failed to compile odata representation for data source [mainService], [${this._stripProjectPaths(manifestPath)}]`)
        }
    }

    _compileEdmxForUri(model, uri) {
        const uriSegments = this._strippedUrlPath(uri).split('/')

        // one segment of the URI has to match a service name
        // NOTE: assumption is that the service definition can be resolved - either by
        // - defining corresponding using statement in annotations model or
        // - adding the service module folder to the model option
        let service = this.cds.reflect(model).find(service => uriSegments.find(segment => service.name === segment))

        if (service) {
            return this.cds.compile.to.edmx(model, {
                service: service.name
            })
        }
        throw new Error(`Failed to resolve service name from URI ${uri} as defined in manfifest.json`)
    }

    _strippedUrlPath(urlString) {
        const url = URL.parse(urlString)
        return url.pathname.replace(/^(\/|\\)/, '').replace(/(\/|\\)$/, '') // strip leading and trailing slash or backslash)
    }

    _property(src, ...segments) {
        return segments.reduce((p, n) => p && p[n], src)
    }
}

module.exports = FioriAppModuleBuilder
