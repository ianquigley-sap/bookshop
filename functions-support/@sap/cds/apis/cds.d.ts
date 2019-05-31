/** This is the central entry point to cds. */
type cds_facade = {}
& typeof import ("./models")
& typeof import ("./reflect")
& typeof import ("./serve")
& typeof import ("./connect")

import * as QL from "./ql"
declare global {
	const cds : cds_facade
	const SELECT : QL.SELECT
	const INSERT : typeof QL.INSERT
	const UPDATE : QL.UPDATE
	const DELETE : QL.DELETE
	const CREATE : QL.CREATE
	const DROP : QL.DROP
}

export = cds