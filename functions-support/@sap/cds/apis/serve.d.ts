import { Service, ServiceImpl } from "./services"
import { csn } from "./specs/CSN"
import { linked } from "./reflect"
declare namespace express { interface app{} }

/**
 * Constructs service providers from respective service definitions
 * @see [capire](https://github.wdf.sap.corp/pages/cap/node.js/api#cds-serve)
 */
export function serve (service : string) : cds_serve
interface cds_serve extends Promise<Services> {
	from (model : string | csn) : this
	to (protocol: string) : this
	at (path: string) : this
	in (app: express.app) : this
	with (impl: ServiceImpl | string) : this
	// (req,res) : void
}

/**
 * Dictionary of all services constructed and/or connected.
 */
export const services : Services
interface Services {
	[name:string]: Service
	// (req,res) : void
}

/**
 * Shortcut to base class for all service definitions from linked models.
 * Plus accessors to impl functions and constructed providers.
 */
export const service : linked & {
	/**
	 * Dummy wrapper for service implementation functions.
	 * Use that in modules to get IntelliSense.
	 */
	impl: (impl: ServiceImpl) => typeof impl
	/**
	 * Array of all services constructed.
	 */
	providers : Service
}
