const fs = require('path');
const randomstring = require("randomstring");

exports.handler = async (event, context) => {
    const ran = randomstring.generate();
    return {
      statusCode: 200,
      headers: { "OData-Version": "4.0", "Content-Type": "application/json;odata.metadata=minimal;IEEE754Compatible=true"},
      body: '{"@odata.context":"$metadata#Authors","value":[{"ID":"1","firstName":"Marcel","lastName":"Proust"},{"ID":"2","firstName":"Miguel","lastName":"de Cervantes"},{"ID":"3","firstName":"James","lastName":"Joyce"},{"ID":"4","firstName":"F.","lastName":"Scott Fitzgerald"}]}'
    };
  };