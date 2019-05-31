import {Definition} from "./specs/CSN"
import * as CQN from "./specs/CQN"

export type Query = CQN.Query

export class SELECT {
	static from (entity : Definition | string) : SELECT
	static distinct : SELECT
	from (entity : Definition | string) : this
	columns (...any) : this
	where (...expr : string[]) : this
	having (...expr : string[]) : this
	groupBy (...expr : string[]) : this
	orderBy (...expr : string[]) : this
	limit (rows : number, offset? : number) : this
	SELECT : CQN.SELECT
}

export class INSERT {
	static into  (entity : Definition | string) : INSERT
	entries (...any) : this
	columns (...col: string[]) : this
	values (... val) : this
	rows (... row) : this
	INSERT : CQN.INSERT
}

export class DELETE {
	static from (entity : Definition | string) : DELETE
	DELETE : CQN.DELETE
}

export class UPDATE {
	static entity (entity : Definition | string) : UPDATE
	UPDATE : CQN.UPDATE
}

export class CREATE {
	static entity (entity : Definition | string) : CREATE
	CREATE : CQN.CREATE
}

export class DROP {
	static entity (entity : Definition | string) : DROP
	DROP : CQN.DROP
}