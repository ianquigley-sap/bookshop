const cds = require ('../cds')
const CSV = require ('../utils/csv')
const Properties = require('../utils/properties')
const {existsSync, readdirSync} = require ('fs')
const {join,dirname,resolve} = require ('path')

const DEBUG = process.env.DEBUG_I18N && console.warn
const conf = cds.env && cds.env.i18n || {}
const DefaultLanguage = conf.default_language || 'en'
const FallbackBundle = conf.fallback_bundle || ''
const I18nFolders = conf.folders || [ '_i18n', 'i18n' ]
const I18nFile = conf.file || 'i18n'
const _been_here = Symbol('been here')


module.exports = Object.assign (localize, {
  bundles4, folders4, folder4, bundle4
})


function localize (model, /*with:*/ locale, aString) {
  const bundle = bundles4 (model, locale)
  const _localizeWith = aString
    ? bundle => localizeString (aString, bundle)
    : bundle => localizeModel (model, bundle)

  if (Array.isArray(locale)) { // array of multiple locales
    return (function*(){
      let any;
      if(bundle) { // try iteration only if bundle is set
          for (let [lang,each] of bundle)  yield any = [ _localizeWith(each), {lang} ]
      }
      if (!any)  yield [ model, {lang:''} ]
    })()
  } else { // a single locale string
    return _localizeWith(bundle)
  }
}

function localizeString (aString, bundle) {
  if (!bundle)  return aString
  return aString.replace (
    /"([^"{]+)?{b?i18n>([^"}]+)}([^"]+)?"/g,
    (_, left, key, right) => `"${ bundle[key] || (left && left.trim()) || (right && right.trim()) || key }"`
  )
}

function localizeModel (model, bundle) { // NOSONAR

  if (!bundle)  return model

  // reuse already prepared localization function...
  const _localizeWith = model._localizedWith || prepareModel()
  return _localizeWith (bundle)

  // prepare model for subsequent localizations
  function prepareModel(){

    const visitors=[]
    cds.reflect(model) .forall (_collectVisitors)
    if (model._xsn)  cds.reflect(model._xsn) .forall (_collectVisitors)  // FIXME 'augmented' CSN

    function _collectVisitors (d) {
      if (Reflect.getOwnPropertyDescriptor(d,_been_here))  return;  else d[_been_here] = true
      for (let p in d) {  //if (p[0] !== '@')  continue //--> doesn't work with XSN due to nested objects
        let v = d[p];  if (!v)  continue
        if (v.val) v = v.val  // FIXME 'augmented' CSN
        if (typeof v === 'object') { _collectVisitors(v); continue }
        if (typeof v !== 'string')  continue
        if (/{b?i18n>([^}]+)}/.test(v)) {
          const key = RegExp.$1,  left = RegExp.leftContext.trim(),  right = RegExp.rightContext.trim()
          visitors.push (bundle => { // FIXME 'augmentxed' CSN
            if (d[p].val)  d[p].val = bundle[key] || left || right || key
            else d[p] = bundle[key] || left || right || key
          })
        }
      }
    }

    function _localizedWith (bundle) {
      for (let each of visitors) each(bundle)
      return model
    }

    Object.defineProperty (model, '_localizedWith', {value:_localizedWith})
    return _localizedWith
  }
}




/**
 * Returns all property bundles, i.e. one for each available translation language,
 * for the given model.
 */
function bundles4 (model, locales=['all']) { // NOSONAR

  const folders = folders4 (model)
  if (folders.length === 0)  return  //> no folders, hence no bundles found at all
  if (typeof locales === 'string')  return bundle4 (model, locales)

  // if no languages are specified, use all available
  if (locales.length === 1 && locales[0] === '*' || locales[0] === 'all') {
    locales = allLocales4 (folders)
    if (!locales)  return {}
    if (!locales.includes(FallbackBundle))  locales.push (FallbackBundle)
  }
  DEBUG && DEBUG ('Languages:', locales)

  return (function*(){
    for (let each of locales) {
      let bundle = bundle4 (model, each)
      if (bundle) {
        DEBUG && DEBUG (bundle.toString())
        yield [ each, bundle ]
      }
    }
  })()
}

/**
 * Return locales for all bundles found in given folders.
 */
function allLocales4 (folders) {
  // find all languages in all folders
  const files = folders
    .map (folder => readdirSync(folder) .filter (e => e.startsWith(I18nFile)))
    .reduce ((files, file) => files.concat(file)) // flatten
  if (files.length === 0) {
    DEBUG && DEBUG ('No languages for folders:', folders)
    return null
  }

  if (files[0].endsWith('.csv')) { // TODO search all folders
    // it's as .csv files...
    return CSV.read (join(folders[0],files[0]))[0].slice(1)
  } else {
    // it's as individual .properties files
    return [... new Set (files.map (f => f.slice (5,-11))) ]
  }
}

/**
 * Returns the effective bundle stack for the given language and model folders.
 * Expected bundle stack for languages en and '' + 2 model layers:
    [en]   model/_i18n
      []   model/_i18n
        [en]   model/node_modules/reuse-model/_i18n
          []   model/node_modules/reuse-model/_i18n
 */
function bundle4 (model, locale) {

  const folders = folders4 (model); if (!folders.length)  return //> no folders, hence no bundles found at all
  const bundle = {}

  add (FallbackBundle)  // e.g. i18n.properties
  if (locale === FallbackBundle)  return bundle

  add (DefaultLanguage)  // e.g. i18n_en.properties
  if (locale === DefaultLanguage)  return bundle

  add (locale)  // e.g. i18n_de.properties
  return bundle

  function add (lang) {
    for (let each of folders) {
      const suffix = lang === '' ? '' : '_' + lang
      const file = join (each, I18nFile),  key = file+suffix
      const next = bundle4[key] || (bundle4[key] = (
        loadFromJSON (file, lang)  ||
        Properties.read (file + suffix.replace('-','_')) ||  // e.g. en-UK --> en_UK
        Properties.read (file + suffix.match(/\w+/)) ||  // e.g. en_UK --> en
        loadFromCSV (file, lang)
      ))
      Object.assign (bundle, next)
    }
  }
}

/**
 * Returns an array of all existing _i18n folders for the models
 * that are merged into the given one..
 */
function folders4 (model) {
  if (model._i18nfolders)  return model._i18nfolders
  // Order of model._sources is expected to be sorted along usage levels, e.g.
  //   foo/bar.cds
  //   foo/node_modules/reuse-level-1/model.cds
  //   foo/node_modules/reuse-level-2/model.cds
  if (!model._sources)  return []
  const folders=[];  for (let src of model._sources) {
    let folder = folder4 (src)
    if (!folder || folders.indexOf(folder) >= 0)  continue
    folders.push(folder)  // use an array here to not screw up the folder order
  }

  Object.defineProperty (model, '_i18nfolders', {value:folders})
  return folders.reverse()
}

/**
 * Returns the location of an existing _i18n folder next to or in the
 * folder hierarchy above the given path, if any.
 */
function folder4 (loc) {
  // already cached from a former lookup?
  if (loc in folder4)  return folder4[loc]
  // check whether a <loc>/_i18n extists
  for (let i18n of I18nFolders) {
    const f = join (loc, i18n)
    if (existsSync(f)) return folder4[loc] = f
  }
  //> no --> search up the folder hierarchy
  let next = dirname(loc)
  return folder4[loc] = !next || next === loc  ?  null  :  folder4(next)
}


function loadFromJSON (res, lang=DefaultLanguage) {
  try {
    const bundles = require (resolve (res+'.json'))
    return bundles[lang] || bundles [(lang.match(/\w+/)||[])[0]]
  } catch(e) {
    if (e.code !== 'MODULE_NOT_FOUND')  throw e
  }
}

function loadFromCSV (res, lang=DefaultLanguage) {
  let csv = CSV.read(res+'.csv'); if (!csv) return
  let [header, ...rows] = csv
  if (lang === '*') return header.slice(1).reduce ((all,lang,i) => {
    all[lang] = _bundle(i); return all
  },{})
  let col = header.indexOf (lang)
  if (col < 0)  col = header.indexOf ((lang.match(/\w+/)||[])[0])
  if (col > 0) return _bundle (col)
  function _bundle (col) {
    const b={}; for (let row of rows) if (row[col])  b[row[0]] = row[col]
    return Object.defineProperty (b, '_source', {value:res+'.csv'+'#'+lang})
  }
}

/* eslint no-console:off */
