/* global QUnit*/

sap.ui.define([
	"sap/ui/test/Opa5",
	"com/sap/app/ui5/test/integration/pages/Common",
	"sap/ui/test/opaQunit",
	"com/sap/app/ui5/test/integration/pages/View1",
	"com/sap/app/ui5/test/integration/navigationJourney"
], function (Opa5, Common) {
	"use strict";
	Opa5.extendConfig({
		arrangements: new Common(),
		viewNamespace: "com/sap/app.ui5.view.",
		autoWait: true
	});
});