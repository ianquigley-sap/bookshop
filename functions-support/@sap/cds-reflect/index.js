const EventEmitter = require('events').prototype
const $=require;  require = (id)=> lazy=> $(id)  // eslint-disable-line
const c = lazy => cds.builtin.classes [lazy]
const cds = module.exports = {__proto__: EventEmitter,

	Association:c,
	Composition:c,
	context:c,
	service:c,
	entity:c,
	struct:c,
	array:c,

	builtin: require ('./lib/core'),
	reflect: require ('./lib/reflect'),
	linked: require ('./lib/link'),
	infer: require ('./lib/infer'),

	clone:m => JSON.parse (JSON.stringify(m)),

    lazify (o=this) {
        const $ = Reflect.defineProperty
        for (let p of Reflect.ownKeys(o)) {
            let v = Reflect.getOwnPropertyDescriptor(o,p).value
            if (typeof v === 'function' && /^\(?lazy[,)\t =]/.test(v)) $(o,p,{configurable:1,
                set:v => $(o,p,{value:v, writable:1}),
                get:() => o[p] = v(p,o),
            })
        }
        return o
    }
}
cds.lazify()
