const fs = require("fs");
const path = require("path");

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
  const metadata = fs.readFileSync(".." + metadataPath, "utf8");
  return metadata;
}
