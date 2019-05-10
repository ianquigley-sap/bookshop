const fs = require("fs");
const path = require("path");
var ls = require('ls');

exports.handler = async (event, context) => {
  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/xml"
    },
    body: getMetadata()
  };
};

function getMetadata() {
  var metadataPath = path.join(
    __dirname,
    "ui",
    "webapp",
    "localService",
    "metadata.xml"
  );
  console.log('h1');
  const l = ls(__dirname + '/*');
  console.log(l);
  // for (var file of ls(__dirname)) {
  //   console.log('h2');
  //   console.log(file.name)
  // }  
  console.log('h3');
  console.log(process.env);
  const metadata = fs.readFileSync("." + metadataPath, "utf8");
  return metadata;
}
