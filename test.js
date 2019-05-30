(async function() {
  const cds = require("@sap/cds");
  const csn = await cds.load("srv/cat-service.cds");

  const express = require("serverless-express/express");
  var app = express();

  cds.serve('CatalogService').from('srv').in(app)
  cds.serve('all').in(app).at('/.netlify/functions/server3') // path must route to lambda
  
  //   cds.serve('CatalogService').from('srv');

  //   await cds.serve('CatalogService').from('srv');
  //   const CatalogService = await cds.serve("all").from(csn);
//   const { CatalogService2 } = await cds.serve("all").with(srv => {
//     srv.on("READ", "Books", req => req.reply("arse"));
//   });
  const cat = await cds.connect("db");
  // console.log(cat);
  // cat.run();
//   await cat.read("Books");
  //   const cat = await cds.connect('db');
  //   await cat.read('Books');
  // //   const edm = cds.compile.to.edm(csn, { service: "CatalogService" });
  //   console.log(edm);
  //   console.log(CatalogService);
  console.log("here!!");
  // const { CatalogService } = await cds.serve('all').from(csn);
  //     console.log(CatalogService.length);
})();
