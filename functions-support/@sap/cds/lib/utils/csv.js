const CSV = module.exports = { read, parse, serialize }

function read (res) {
  try{
    const fs = require ('fs')
    return CSV.parse (fs.readFileSync (res, 'utf-8'))
  } catch(e){/* ignore */}
}

function parse (csv) {
  if (csv[0] === BOM)  csv = csv.slice(1)
  let sep = csv.match(/([,;\t])/)  ?  RegExp.$1  :  ";"
  let rows = []
  csv.split (/\s*\n/) .forEach (line => {
    let values=[], val="", c
    for (let i=0; i<line.length; ) {
      c = line[i++]
      if (c === sep) { values.push (val || undefined);  val="" }
      else if (c === '"') {
        if (line[i] === '"')  val += line[i++]
        else while (i<line.length) {
          let x = line[i++]
          if (x === '"') {
            if (line[i] === '"')  val += line[i++]
            else break
          }
          else if (x === '\\')  val += '\\\\'
          else  val += x
        }
      }
      else if (c === '\\')  val += '\\\\'
      else  val += c
    }
    if (val || c === sep)  values.push(val)
    if (values.length > 0)  rows.push (values)
  })
  return rows
}

function serialize (rows, columns, bom='\ufeff') {
  let csv = bom + ( columns || Object.keys(rows[0]) ).join(';') +"\n"
  for (let key in rows)  csv += `${key};${rows[key]}\r\n`
  return csv
}

const BOM = '\ufeff'
