import { SELECT, INSERT, UPDATE, DELETE, Query } from './ql'
import { LinkedModel, Definitions } from './reflect'
import { csn, Definition } from "./specs/CSN"

export interface Service extends QueryAPI, ProviderAPI {

	/** The model from which the service's definition was loaded */
	model: LinkedModel

	/** Provides access to the entities exposed by a service
	 * @see [capire](https://github.wdf.sap.corp/pages/cap/node.js/api#srventities-types--namespace--defs)
	 */
	entities: Definitions & ((namespace: string) => Definitions)

	/** Provides access to the types exposed by a service
	 * @see [capire](https://github.wdf.sap.corp/pages/cap/node.js/api#srventities-types--namespace--defs)
	 */
	types: Definitions & ((namespace: string) => Definitions)

	/** Starts or joins a transation
	 * @see [capire](https://github.wdf.sap.corp/pages/cap/node.js/api#srvtransaction--context--tx)
	 */
	transaction (context) : Transaction
}

export interface Transaction extends QueryAPI {
	commit() : Promise<void>
	rollback() : Promise<void>
}

export interface Database extends Service {
	deploy (model?: csn | string) : Promise<csn>
	begin() : Promise<void>
	commit() : Promise<void>
	rollback() : Promise<void>
}

export interface ResultSet extends Array<{}> {
}

interface QueryAPI {
	read (entity : Definition | string) : SELECT
	insert (entity : Definition | string) : INSERT
	update (entity : Definition | string) : UPDATE
	delete (entity : Definition | string) : DELETE
	run (block : (tx:Transaction) => void) : Promise<ResultSet[]>
	run (query : Query) : Promise<ResultSet>
	foreach (query : Query, callback) : this
}

interface ProviderAPI {
	impl (fn: ServiceImpl) : this
	on (eve: Event_, entity: Target, handler?: EventHandler) : this
	before (eve: Event_, entity?: Target, handler?: EventHandler) : this
	after (eve: Event_, entity?: Target, handler?: ResultsHandler) : this
	reject (eves: CRUD | CRUD[], ...entity: Target[]) : this
	dispatch (msg : EventMessage)
}

export interface ServiceImpl {
	( this: Service, srv: Service ) : any
}

export interface EventHandler {
	// (msg : EventMessage) : Promise<any> | any | void
	(req : Request) : Promise<any> | any | void
}

interface ResultsHandler {
	(results : any[])
	(each : any)
}

interface EventMessage {
	event : string
	data : {}
}

interface Request extends EventMessage {
	target : Definition
	query : Query
	reply()
	error()
	reject()
}

type Event_ = Event | Event[]
type Event = CRUD | TX | HTTP | string
type CRUD = 'CREATE' | 'READ' | 'UPDATE' | 'DELETE'
type HTTP = 'GET' | 'PUT' | 'POST' | 'DELETE' | 'PATCH'
type TX = 'COMMIT' | 'ROLLBACK'
type CustomOp = string
type Target = string | Definition
