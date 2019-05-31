/* USAGE: */()=>{ //NOSONAR

	// with a fully specified target file
	write ({foo:'bar'}) .to ('some/folder/foo.json')

	// with separately specified destination folder
	write ({foo:'bar'}) .to ('some/folder', 'foo.json')

	// with a separately specified destination folder and suffix
	write ({foo:'bar'}) .to ('some/folder', 'foo', '.json')

	// using a named parameter object instead
	write ({foo:'bar'}) .to ({ folder: 'some/folder', file:'foo', suffix:'.json' })

	// with an optional callback invoked per written file
	write ({foo:'bar'}) .to ('...', console.log)

	// with a statically constructed writer function applied asynchronously
	Promise.resolve (function*(){ yield* [[1,{file:'foo.json'}],[2,{file:'bar.json'}]] })
	.then (write.to ('some/folder'))
}

const { write:fs_write, mkdirp, writeFile, path } = require('./fs'), { join, dirname } = path
const write_file = require('util').promisify (writeFile)


const write = module.exports = Object.assign (
	/**
	 * Fluent API to write (output) .to (dest...)
	 * @param content - the content to be written; will be JSON.stringified if it's not a string
	 */
	(content, more) => { // NOSONAR
		return more ? fs_write(...arguments) : {
			/**
			 * @param {string} [folder] - optional separately specified destination folder
			 * @param {string} file - the filename to write to
			 * @param {string} [suffix] - optional suffix to append
			 * @param {(string)=>void} [foreach] - optional callback to invoke per written file
			 */
			to: (folder, file, suffix, foreach) => _write (content,
				typeof folder === 'object' ? folder :
				typeof folder === 'function' ? { log:folder } :
				typeof file === 'function' ? { file:folder, foreach:file } :
				typeof suffix === 'function' ? { folder, file, foreach:suffix } :
				{ folder, file, suffix, foreach }
			)
		}
	}, {

	/**
	 * Returns a writer function to be used subsequently. Handy when combined with output
	 * coming from prior async tasks.
	 */
	to: (...dest) => (content) => write (content) .to (...dest)
})

/**
 * @returns {Promise<[string]>} a Promise resolving to an array of all written filenames
 */
function _write (content, /*to:*/ dest, _many) { // NOSONAR

	// if the obtained output is a generator --> write each...
	if (content && content.next && content[Symbol.iterator]) {
		let all=[]; for (let [x,d] of content) {
			if (typeof d === 'string')  d = { file:d }
			all.push (_write (x, Object.assign(dest,d), d && '_many'))
		}
		return Promise.all(all)
	}

	// if output is a single generator entry --> write it...
	// if (Array.isArray(content) && content.length === 2 && content[0] && content[1]) {
	// 	return _write (content[0], Object.assign(content[1], dest))
	// }

	// construct the filename
	let file = dest.name || dest.file || ''
	if (dest.folder)  file = join (dest.folder, file) //.replace (/[:/\\]/g, '_') )
	if (dest.lang)  file += '_'+ dest.lang
	file += dest.suffix || ( /\.\w+$/.test(file) ? '' : '.json' )

	// if dest.log is specified just log to it
	if (dest.log) { //
		if (_many)  dest.log ('-----', file, '-----')
		dest.log (content)
		return Promise.resolve (file)
	}

	// write to the target file, creating parent folders if neccessary
	return mkdirp (dirname(file))
	.then (()=> write_file (file, typeof content === 'string' ? content : JSON.stringify (content, null, 2)))
	.then (()=> dest.foreach && dest.foreach(file))
	.then (()=> file)

}

/* eslint no-console:off */