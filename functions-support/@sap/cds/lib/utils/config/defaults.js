module.exports = {

  features: { localized: true },

  folders: {
    app: 'app',
    srv: 'srv',
    db: 'db',
  },
  i18n: {
    folders: ['_i18n', 'i18n', 'assets/i18n'],
    default_language: 'en'
  },

  requires: {
    // db: { credentials: {} }
  },
  odata: { version:"v2" },

  build: { target: 'gen' },
  cdsc: {
    // toSql: { associations: "joins" },
    // newCsn: true,
    smart: {
      // to_many: true
    }
  },
  deploy: {},
  sql_mapping:"plain", // or 'hdbcds',
  mtx: {
    api: {
      model: true,
      provisioning: true,
      metadata: false
    },
    domain: '__default__'
  }
}
