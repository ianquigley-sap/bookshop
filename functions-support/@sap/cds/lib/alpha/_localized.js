const DEBUG = process.env.DEBUG_COMPILE && console.warn // eslint-disable-line
const cds = require('../cds')
const _4sqlite = ['de','fr']


///////////////////////////////////////////////////////////
//   cds-compiler part
//

// Rewrites DDL output of 2sql
const unfold = function _unfold_localized_entities_in (ddl, csn, o) { // NOSONAR
	if (o && o.toSql && o.toSql.dialect === 'hana') return ddl;
	csn = cds.compile.for.sql (csn)
	cds.linked(csn) .foreach (e => e.is('view') && e.name.startsWith('localized.'), ({name}) => {
		let cvx, cv = ddl.find (x => x.startsWith (`CREATE VIEW ${name.replace(/\./g,'_')}`))
		for (let each of _4sqlite) {
			ddl.push (cvx = cv
				.replace (/localized_/g, `localized_${each}_`)
				.replace (/\.locale = 'en'/, `.locale = '${each}'`)
			)
			DEBUG && DEBUG (cvx.match(/CREATE VIEW \w+/)[0])
		}
	})
	return ddl
}


function _add_placebos4 (srv,entity) {
	const d = srv.entities [entity]
	srv.model.definitions [`localized.${d.name}`] = d
	for (let each of _4sqlite)
		srv.model.definitions [`localized.${each}.${d.name}`] = d
}




///////////////////////////////////////////////////////////
//   cds.services part
//

// Interecpt all read requests to localized entities
const serve = function _serve_localized_entities_in (srv) {
	const entities = srv.entities
	for (let each in entities) {
		if (_is_localized (entities [each])) {
			_add_placebos4 (srv,each)   // only required until the cds compiler gives us the correct views for exposed entities
			srv.before ('READ', each, _read_from_localized_entity)
		}
	}
	return srv
}

// Redirect incoming read requests to localized. views unless in Fiori draft
function _read_from_localized_entity (req) {
	if (!req._is_in_fiori_draft) { // TODO: how to correctly detect draft mode
		const {SELECT} = req.query, entity = req.target.name
		SELECT.from.ref[0] = `localized.${entity}`
		if (_4sqlite) { // experimental variant for sqlite
			const locale = req.user.locale
			if (_4sqlite.includes(locale))  SELECT.from.ref[0] = `localized.${locale}.${entity}`
		}
	}
}



///////////////////////////////////////////////////////////
//   cds.connect part
//

// Interecpt all read requests to localized entities
const connect = function _unfold_localized_entities_in (srv) {
	const entities = srv.entities
	for (let each in entities) {
		if (_is_localized (entities [each])) {
			_add_placebos4 (srv,each)   // only required until the cds compiler gives us the correct views for exposed entities
		}
	}
	return srv
}


///////////////////////////////////////////////////////////
//   shared
//

// Localized entities have an association named 'localized'
function _is_localized (d) {
	return d.elements && 'localized' in d.elements
}

// feature-toggled exports
module.exports = cds.env.features.localized
? { unfold, serve, connect }
: { unfold: x=>x, serve: x=>x, connect: x=>x }
