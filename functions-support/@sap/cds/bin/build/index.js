module.exports = Object.assign ( build, {
  options: [ '--clean', '--project', '--dest', '--dry'],
  shortcuts: ['-c', '-in', '-o' ],
  help: `
# SYNOPSIS

    *cds build* [<project>] [<options>]

    Builds all modules in the given or current project by compiling contained
    cds sources according to the module types. The modules are folders in the
    project root. All well known modules or those configured in _package.json_
    are built.


# OPTIONS

    *-in* | *--project* <folder>

        use the specified folder as the project root.
        default = current working directory ./

    *-c*  | *--clean*

        deletes target folders before building modules.
        default = _true_

    *-i*  | *--incremental*

        do not delete target folders before building modules.

    *-l*  | *--lang* <languages> | all

        localize the models with given <languages>, a comma-separated list
        of language/locale codes or _all_.

    *-o*  | *--dest* <folder>

        writes output to the given folder.
        default = <project root>


# EXAMPLES

   *cds* build
   *cds* build project -o _out

`})

const cds_ = require('../../lib/cds')
const fs = require('fs-extra')
const path = require('path')
const os = require('os')
const URL = require('url')

const DEFAULT_ODATA_VERSION = 'v2'
const DEFAULT_ODATA_FILE_SUFFIX = ''
const DEFAULT_DATA_DIR = cds_.env.folders.db
const DEFAULT_SERVICE_DIR = cds_.env.folders.srv
const DEFAULT_UI_MANIFEST_PATTERNS = [
  '*/webapp',    // top-level UI apps  (typical Web IDE layout)
  'app/*/webapp' // UI apps below app/ (good for grouping many UI apps)
].map(p => path.join(p, 'manifest.json'))


function build([ project ], options={}, config) {
  const compile = require('../compile')

  if (!project)  project = options.project
  const cds = project ? cds_.in(project) : cds_
  config = config || cds.env

  if (cds.env.build.version >= 3)  return require('./all')({ project:project, __proto__:options })

  const logger = options.log || console.log
  project = project ? path.resolve(project) : process.cwd()
  const toProjectPath = (filename) => path.resolve(project, filename)
  const sql_mapping = config.sql_mapping
  const outputPaths = []

  // print version info
  const info = require('../version').get()
  logger(`This is CDS ${info['@sap/cds']}, Compiler ${info['@sap/cds-compiler']}, Home: ${path.relative(project, info.home)}\n`)

  return Promise.all([
    cds.resolve (config.requires.db && config.requires.db.model || DEFAULT_DATA_DIR),
    cds.resolve (config.folders.srv)
  ])
  .then(([dataModels, serviceModels]) => {
    validate(dataModels, serviceModels, config, project)

    const promises = []
    // to HANA
    if (dataModels) {
      for (let modelPath of dataModels) {
        // REVISIT: this uses outdated config options cds.env.data
        let data = config.data || {}
        const outDir = getOutDir(project, modelPath, data.dest || data.to, DEFAULT_DATA_DIR, 'src/gen')
        outputPaths.push(outDir)

        const log = file => log.files.push(file); log.files = []
        const models = [modelPath]
        // add service views to HANA compilation (Java runtime needs them on DB)
        if (serviceModels && serviceModels.length > 0 && config.build && config.build.addsrv2db !== false) {
          models.push(...(serviceModels.filter(m => models.indexOf(m) < 0))) // cdsv doesn't like dups in the list
        }
        // TODO find a way to handle test config as normal cds.env
        const p = compile(models.map(toProjectPath), { to: 'hana', sql_mapping, dest: outDir, log })
          // Add an .hdinamespace file that prevents the gen/ dir to be appended as a namespace segment.
          // This would happen if the src/ dir above adds an .hdinamespace with 'subfolder:append'.  See issue #64.
          .then(()=> cds.write ({ name:'', subfolder: 'ignore' }) .to ({ folder:outDir, file:'.hdinamespace', foreach:log }))
          .then(()=> displayResultPaths (log.files, `Compiled '${toRelPaths([modelPath])}' to`, logger))
          .catch(err => { err._source = toRelPaths([modelPath]); throw err })  // attach model source to error
        promises.push (p)
      }
    }

    // to OData
    if (serviceModels) {
      const service = config.service || {}
      const odata = config.odata || {}
      const version = odata.version || DEFAULT_ODATA_VERSION
      const suffix = (odata.edmxFileSuffix === undefined ?
        DEFAULT_ODATA_FILE_SUFFIX : odata.edmxFileSuffix) + '.xml'
      const ui = config.ui || {}

      // group models by output path, so that we can compile all models belonging to the same output
      const modelsByOutputPath = {}
      serviceModels.forEach(modelPath => {
        const outDir = getOutDir(project, modelPath, service.dest || service.to, DEFAULT_SERVICE_DIR, 'src/main/resources/edmx/')
        modelsByOutputPath[outDir] = modelsByOutputPath[outDir] || []
        modelsByOutputPath[outDir].push(modelPath)
      })
      Object.keys(modelsByOutputPath).forEach(outDir => {
        outputPaths.push(outDir)
        const serviceModelPaths = modelsByOutputPath[outDir].map(toProjectPath)
        const log = file => log.files.push(file); log.files = []
        const baseOptions = {}
        const odataCsnOptions = Object.assign({ for: 'odata', file: 'csn.json', sql_mapping, dest: outDir, log }, baseOptions)
        const edmxOptions = Object.assign({ to: 'edmx', service: 'all', lang: 'all', version, suffix, dest: outDir, log }, baseOptions)
        const p = Promise.all([
          compile(serviceModelPaths, odataCsnOptions),
          compile(serviceModelPaths, edmxOptions)
            .then(() => writeUiFiles(ui.apps, log.files, project)).then(files => log.files.push(...files))
        ])
        .then(() => displayResultPaths(log.files, `Compiled '${toRelPaths(serviceModelPaths)}' to`, logger))
        .catch(err => {err._source = toRelPaths(serviceModelPaths); throw err})  // attach model source to error
        promises.push (p)
      })
    }

    return Promise.all (promises)
  })
  .then(writeResultLogFile)
  .then(filePaths => options.clean ? cleanOrphans(outputPaths, filePaths, logger) : filePaths)
  .catch(reportErrors)
}

function validate(dataModels, serviceModels, config, project) {
  if (!dataModels && !serviceModels) {
    throw new Error(`No models found in '${project}' and configuration '${config._sources || JSON.stringify(config)}'.  Use \`cds init <project>\` to create a project.`)
  }
  if (!dataModels && config.requires.db && config.requires.db.model && config.requires.db.model !== '--') {
    throw new Error(`No models found for '${config.data.model}' as configured in '${config._sources || JSON.stringify(config)}'`)
  }
  // TODO info if no services found?
  // if (!serviceModels && config.service && config.service.model && config.service.model !== '--') {
  //   throw new Error(`No models found for '${config.service.model}' as configured in '${config._sources || JSON.stringify(config)}'`)
  // }
}

/**
 * Writes the service edmx file to the respective UI app for the service.
 * Parses manifest.json to find the service correlation and destination file.
 */
function writeUiFiles(uiApps, serviceFiles, baseDir) {
  let manifestPaths
  if (uiApps) { // explicit config in ui.apps
    manifestPaths = uiApps.map(appPath => path.resolve(baseDir, appPath, 'manifest.json'))
  } else { // search for files
    manifestPaths = findFiles(baseDir, DEFAULT_UI_MANIFEST_PATTERNS)
  }
  if (manifestPaths.length === 0)  return []

  const serviceFilesForName = {}  // index service files by name for fast access below
  serviceFiles.forEach(file => serviceFilesForName[path.parse(file).name] = file)

  return Promise.all(manifestPaths
    .map(manifestPath => fs.readJson(manifestPath).then(uiManifest => {
      if (uiManifest['sap.app'] && uiManifest['sap.app'].dataSources) {
        const mainService = uiManifest['sap.app'].dataSources.mainService
        if (mainService && mainService.uri && mainService.settings && mainService.settings.localUri) {
          // found a matching service in the uri path segments?
          const serviceName = strippedUrlPath(mainService.uri).split('/').find(segment => serviceFilesForName[segment])
          if (serviceName) {
            const serviceFile = serviceFilesForName[serviceName]
            const destinationFile = path.resolve(path.dirname(manifestPath), strippedUrlPath(mainService.settings.localUri))
            return fs.copy(serviceFile, destinationFile).then(() => destinationFile)
          }
        }
      }
    }))
  ).then(flatten)
}

function getOutDir (root, modelPath, to, defaultBaseDir, defaultSubPath) {
  if (to) {
    return path.resolve(root, to)
  }
  modelPath = path.relative(root, modelPath)
  // console.log(modelPath + ' -> ' + cds.get.resolve.model(modelPath, root))
  let base = modelPath.indexOf(path.sep) <= 0  // root-level file?
    ? path.resolve(root, defaultBaseDir)  // yes: add default base (srv/, db/)
    : path.dirname(cds_.resolve(modelPath,{root})[0]) // no: use dir of resolved model file
  return path.resolve(base, defaultSubPath)
}

function cleanOrphans (outDirs = [], excludes = [], logger) {
  outDirs = outDirs.filter(dir => !!dir) // remove null entries
  outDirs = Array.from(new Set(outDirs)) // de-duplicate
  excludes = flatten(excludes)
  if (excludes.length === 0) { // full clean: just remove the dirs
    return Promise.all(outDirs.map(outDir => fs.remove(outDir).then(() => outDir)))
  }
  // 'delta-clean': remove all files that are not in the excludes list
  return Promise.all(outDirs.map(outDir => {
    const readdir = fs.readdir(outDir)
    if (!readdir)  return Promise.resolve() // with bad timing readdir might return undefined for deleted dirs
    return readdir.then(files => Promise.all(files
      .map(file => path.resolve(outDir, file))
      .filter(file => !excludes.includes(file))
      .map(file => fs.remove(file).then(() => file))
    )).catch(err => {if (err.code !== 'ENOENT')  throw err})  // ignore deleted dirs/files
  }))
  .then(files => displayResultPaths(files, 'Cleaned', logger))
}

function flatten (o, arr = []) {
  if (o) {
    Array.isArray(o) ? o.forEach(e => flatten(e, arr)) : arr.push(o)
  }
  return arr
}

function toRelPaths (paths) {
  return paths.map(p => path.relative(process.cwd(), p))
}

function displayResultPaths (paths, prelude, logger) {
  paths = flatten(paths)
  paths = Array.from(new Set(paths)).sort() // de-duplicate, sort
  if (paths.length > 0)  logger(prelude)
  toRelPaths(paths).sort().forEach(r => logger('  ' + r))
  return paths
}

function writeResultLogFile (paths) {
  paths = flatten(paths)
  paths = Array.from(new Set(paths)).sort() // de-duplicate, sort
  let resultFilePath = process.env.GENERATION_LOG
  if (!resultFilePath) return paths

  let relPaths = ''
  toRelPaths(paths).forEach(r => { relPaths += r + os.EOL })

  return fs.writeFile(resultFilePath, relPaths).then(() => paths)
}

function reportErrors (e) {
  if (e._source)  e.message = `${e._source}: ${e.message}`
  return Promise.reject(e)
}

function strippedUrlPath(urlString) {
  const url = URL.parse(urlString)
  return strippedPath(url.pathname)
}

function strippedPath(p) {
  return p.replace(/^(\/|\\)/, '').replace(/(\/|\\)$/, '') // strip leading and trailing slash or backslash
}

function findFiles(baseDir, patterns) {
  const files = []
  patterns.forEach(pattern => {
    const starIndex = pattern.indexOf('*')
    if (starIndex >= 0) {
      const dir = path.resolve(baseDir, pattern.substring(0, starIndex))
      const subPattern = strippedPath(pattern.substring(starIndex + 1, pattern.length)) // '*/foo/bar/' -> 'foo/bar'
      files.push(...readDirs(dir).map(subDir => findFiles(subDir, [subPattern])))
    } else {
      const file = path.resolve(baseDir, pattern)
      if (fs.pathExistsSync(file))  files.push(file)
    }
  })
  return flatten(files)
}

function readDirs(dir) {
  if (!fs.pathExistsSync(dir) || !fs.lstatSync(dir).isDirectory()) return []
  return fs.readdirSync(dir)
    .map(f => path.resolve(dir, f))
    .filter(f => fs.lstatSync(f).isDirectory())
}

/* eslint no-console:0 no-extend-native:0 */