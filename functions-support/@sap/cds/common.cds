/**
 *  Recommended types for language, currency and country elements
 *  along with corresponding code lists to be reused.
 */
type Language : Association to sap.common.Languages;
type Currency : Association to sap.common.Currencies;
type Country  : Association to sap.common.Countries;

/**
 *  Entities to serve the reuse types with extensible code lists
 *  including built-in support for value lists in Fiori.
 */
context sap.common {
 
  entity Languages  : CodeList { key code : String(5); }
  entity Countries  : CodeList { key code : String(3); }
  entity Currencies : CodeList { key code : String(3);
    symbol : String(2);
  }

  aspect CodeList @(cds.autoexpose, cds.persistence.skip:'if-unused') {
    name  : localized String(255) @title:'{i18n>Name}';
    descr : localized String(1000) @title:'{i18n>Description}';
  }

}


/**
 * Aspect for entities with canonical universal IDs.
 */
abstract entity cuid {
  key ID : UUID;  //> automatically filled in
}

/**
 * Aspect to capture changes by user and name.
 */
aspect managed {
  modifiedAt : DateTime @cds.on.update: $now @odata.etag;
  createdAt  : DateTime @cds.on.insert: $now;
  createdBy  : User     @cds.on.insert: $user;
  modifiedBy : User     @cds.on.update: $user;
}


/**
 * Aspects for entities with temporal data.
 */
aspect temporal {
  validFrom : DateTime @cds.valid.from;
  validTo   : DateTime @cds.valid.to;
}


/**
 * Canonical user IDs
 */
type User : String(255);



//---------------------------------------------------------------------------
// Annotations for Fiori UIs...

  annotate sap.common.CodeList with @UI.Identification: [name];
  annotate sap.common.CodeList with @cds.odata.valuelist;

  annotate managed with {
  	createdAt @UI.HiddenFilter;
  	createdBy @UI.HiddenFilter;
  	modifiedAt @UI.HiddenFilter;
  	modifiedBy @UI.HiddenFilter;
  }

  annotate managed with {
  	createdAt @Core.Immutable;
  	createdBy @Core.Immutable;
  	modifiedAt @Core.Immutable;
  	modifiedBy @Core.Immutable;
  }


//---------------------------------------------------------------------------
// Common Annotations...

  annotate Language with @( title:'{i18n>Language}', description:'{i18n>LanguageCode.Description}' );
  annotate Currency with @( title:'{i18n>Currency}', description:'{i18n>CurrencyCode.Description}' );
  annotate Country  with @( title:'{i18n>Country}', description:'{i18n>CountryCode.Description}' );
  annotate User with @( title:'{i18n>UserID}', description:'{i18n>UserID.Description}' );

  annotate managed with {
  	createdAt  @title:'{i18n>CreatedAt}';
  	createdBy  @title:'{i18n>CreatedBy}';
  	modifiedAt @title:'{i18n>ChangedAt}';
  	modifiedBy @title:'{i18n>ChangedBy}';
  }


//---------------------------------------------------------------------------
// Temporary Workarounds...

  // REVISIT: change @odata.on... to @cds.on...
  // REVISIT: @cds.on... should automatically result in @readonly @Core.Computed

  annotate managed with {
    modifiedAt @readonly @odata.on.update: #now;
    createdAt  @readonly @odata.on.insert: #now;
    createdBy  @readonly @odata.on.insert: #user;
    modifiedBy @readonly @odata.on.update: #user;
  }

//---------------------------------------------------------------------------
