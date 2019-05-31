const path = require ('path'), { dirname, join } = path
const fs = require ('fs')
const rw = fs.constants.R_OK | fs.constants.W_OK

module.exports = {__proto__:fs,
    path, mkdirp, rimraf, rimrafSync, isdir, isfile, find, copy,
    get write(){
        const write = require('./write')
        Object.defineProperty (this,'write',{value:write})
        return write
    }
}


if (!fs.copyFile)  fs.copyFile = (src, dst, callback) => {
  const wr = fs.createWriteStream(dst) .on ('error',_cleanup) .on ('finish',_done)
  const rd = fs.createReadStream(src) .on ('error',_cleanup) .pipe (wr)
  function _cleanup(e) { rd.destroy(); wr.end(); callback(e) }
  function _done() { callback (undefined,dst) }
}


function mkdirp (p, _done, _error=()=>{}) { // NOSONAR
    if (!_done) { // use promise style if no callback given:
        return mkdirp[p] || (mkdirp[p] = new Promise ((d,e) => mkdirp(p,d,e)))
        .then (()=>{ delete mkdirp[p]; return p })
    }
    !p ? _done() : fs.access (p, rw, e=>
		!e ? _done(p) : mkdirp (dirname(p), ()=>{
            fs.mkdir (p, e=>e ? _error(e) : _done(p))
        })
	)
}


function copy (src, dst, _mkdirp) { // NOSONAR
    // use fluent style if no dst given:
    if (!dst)  return { to:(...rest) => copy (src,...rest) }
    return new Promise ((_done,_failed)=>{
        _mkdirp ?  mkdirp (dirname(dst), _copy, _failed) : _copy()
        function _copy() { // NOSONAR
            isfile(src) ? _copy_file()  :
            isdir(dst) ? _copy_dir()  :
            fs.mkdir (dst, e=> e ? _failed(e) : _copy_dir())
        }
        function _copy_file() {
            fs.copyFile (src, dst, e => e ? _failed(e) : _done())
        }
        function _copy_dir() {
            fs.readdir (src, (e,entries) => e ? _failed(e) : Promise.all (
                entries.map (e => copy (join(src,e), join(dst,e)))
            ) .then (_done))
        }
    })
}

function rimraf (dir,ignore) { return new Promise ((_resolved,_error)=> {
    fs.readdir (dir, (e,files) => { if (e) return ignore ? _resolved() : _error(e)
        let n = files.length
        for (let each of files) {
            let child = join (dir,each)
            fs.lstat (child,(e,f)=>{ if(e) return _error(e)
                if (f.isDirectory())  rimraf(child).then (()=> --n || _rmdir())
                else  fs.unlink (child, (e) => e ? _error(e) : --n || _rmdir())
            })
        }
    })
    function _rmdir(){ fs.rmdir (dir, (e) => e ? _error(e) : _resolved()) }
})}

function rimrafSync (dir) {
    for (let each of fs.readdirSync(dir)) {
        let child = join (dir,each)
        if (isdir(child))  rimrafSync(child);
        else  fs.unlinkSync(child);
    }
    fs.rmdirSync(dir)
}

function isdir (x) {
    if (x) try {
        let ls = fs.lstatSync(x)
        return ls.isDirectory() && x || ls.isSymbolicLink() && isdir (
            join(x,'..',fs.readlinkSync(x))
        )
    } catch(e){/* ignore */}
}

function isfile (x) {
    if (x) try {
        let ls = fs.lstatSync(x)
        return ls.isFile() && x || ls.isSymbolicLink() && isfile (
            join(x,'..',fs.readlinkSync(x))
        )
    } catch(e){/* ignore */}
}

function find (base, patterns='*', filter=()=>true) {
    const files=[];  base = path.resolve(base)
    if (typeof patterns === 'string')  patterns = patterns.split(',')
    if (typeof filter === 'string')  filter = this[filter]
    patterns.forEach (pattern => {
        const star = pattern.indexOf('*')
        if (star >= 0) {
            const head = pattern.slice(0,star).replace(/[^/\\]*$/,'')
            const dir = join (base,head)
            if (isdir(dir)) {
                const [,suffix,tail] = /([^/\\]*)?(?:.(.*))?/.exec (pattern.slice(star+1))
                const prefix = pattern.slice(head.length,star)
                let entries = fs.readdirSync(dir) //.filter (_filter)
                if (prefix)  entries = entries.filter (e => e.startsWith(prefix));  if (!entries.length) return
                if (suffix)  entries = entries.filter (e => e.endsWith(suffix));  if (!entries.length) return
                let paths = entries.map (e=>join(dir,e))
                if (filter)  paths = paths.filter (filter);  if (!paths.length) return
                if (tail)  for (let _files of paths.map (e=>find (e,tail,filter)))  files.push (..._files)
                else  files.push (...paths)
            }
        } else {
            const file = join (base, pattern)
            if (fs.existsSync(file))  files.push (file)
        }
    })
    return files
}


if (!module.parent) {
    const [base,pattern,filter] = process.argv.slice(2)
    console.time('') // eslint-disable-line
    let found = module.exports.find (base,pattern,filter)
    console.timeEnd('') // eslint-disable-line
    console.log (found) // eslint-disable-line
}