const fs = require("fs");
const path = require("path");
var metadataPath = path.join(
  __dirname,
  "ui",
  "webapp",
  "localService",
  "metadata.xml"
);
const metadata = fs.readFileSync("." + metadataPath, "utf8");

exports.handler = async (event, context) => {
  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/xml"
    },
    body: metadata
  };
};