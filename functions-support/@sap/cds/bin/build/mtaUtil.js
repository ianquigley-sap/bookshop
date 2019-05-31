const fs = require('fs-extra')
const path = require('path')

const HDI_CONTAINER_TYPE = 'com.sap.xs.hdi-container'
const UTF_8 = 'utf-8'

class MtaUtil {
    static async getHdiServiceName(projectPath, modulePath, logger) {
        if (!projectPath || !modulePath || !logger) {
            throw new Error("Invalid parameter")
        }
        const mta = await this._getMta(projectPath, logger)
        const moduleName = path.relative(projectPath, modulePath)
        const hdiResource = this._findHdiResource(mta, moduleName, logger)

        return hdiResource ? hdiResource.name : `${path.basename(projectPath)}-${moduleName}-hdi-container`
    }

    static async getApplicationName(projectPath, modulePath, moduleType, logger) {
        if (!projectPath || !modulePath || !logger) {
            throw new Error("Invalid parameter")
        }
        const mta = await this._getMta(projectPath, logger)
        const moduleName = path.relative(projectPath, modulePath)
        const module = this._findModule(mta, moduleName, moduleType)

        return module ? module.name : `${path.basename(projectPath)}-${moduleName}`
    }

    static async findModules(projectPath, logger) {
        if (!projectPath || !logger) {
            throw new Error("Invalid parameter")
        }
        const mta = await this._getMta(projectPath, logger)

        if (mta && Array.isArray(mta.modules)) {
            return mta.modules
        }
        return []
    }

    static async _getMta(projectPath, logger) {
        // yaml.parse  oesn't like null
        const mtaFilePath = path.join(projectPath, 'mta.yaml')

        try {
            const yamlStr = await fs.readFile(mtaFilePath, UTF_8);

            // yaml returns null if string couldn't be parsed, e.g. empty string
            const YAML = require('yaml');
            return YAML.parse(yamlStr) || null
        } catch (e) {
            if (e.name === "YAMLSyntaxError") {
                logger.error(`Failed to parse [${mtaFilePath}]`)
            }
            logger.log(e)
        }
        return null
    }

    static _findModules(mta, moduleType) {
        let modules = []
        if (mta && Array.isArray(mta.modules)) {
            modules = mta.modules.filter(module => module.type === moduleType)
        }
        return modules
    }

    static _findModule(mta, moduleName, moduleType) {
        const modules = this._findModules(mta, moduleType)
        if (modules.length === 1) {
            return modules[0]
        } else if (modules.length > 1) {
            return modules.find(module => typeof module.path === 'string' && module.path.includes(moduleName))
        }
        return null
    }

    static _findHdiResource(mta, moduleName) {
        if (mta && Array.isArray(mta.resources)) {
            const hdiResources = mta.resources.filter(resource => resource.type === HDI_CONTAINER_TYPE)

            if (hdiResources.length === 1) {
                return hdiResources[0]
            } else if (hdiResources.length > 0) {
                if (Array.isArray(mta.modules)) {
                    const module = this._findModule(mta, moduleName, "hdb")
                    if (module && Array.isArray(module.requires)) {
                        return module.requires.find(req => hdiResources.find(hdiResource => hdiResource.name === req))
                    }
                }
            }
        }
        return null
    }
}
module.exports = MtaUtil
