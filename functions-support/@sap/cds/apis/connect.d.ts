import { Service } from "./services"
import * as cds from './cds'

export = _cds
declare const _cds : {

	connect : {
		/**
		 * Connects to a specific datasource.
		 * @see [capire](https://github.wdf.sap.corp/pages/cap/node.js/api#cds-connect)
		 */
		to (datasource?: string, options?: ConnectOptions) : Service & Promise<Service>

		/**
		 * Connects the primary datasource.
		 * @see [capire](https://github.wdf.sap.corp/pages/cap/node.js/api#cds-connect)
		 */
		(options?: string | ConnectOptions) : typeof cds  //> cds.connect(<options>)
	}

} & Service


type ConnectOptions = {
	kind?:string,
	model?:string,
	credentials: {
		database?:string,
	},
}