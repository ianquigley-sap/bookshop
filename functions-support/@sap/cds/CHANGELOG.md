# Change Log

All notable changes to this project will be documented in this file.

This project adheres to [Semantic Versioning](http://semver.org/).

The format is based on [Keep a Changelog](http://keepachangelog.com/).

## Version 3.10.0 - 2019-05-21

### Added
- Tables and view for localized entities are created by default now, both for HANA and SQLite.
- Internal errors are now marked as such in all CLI commands, with a request to report them.

### Changed
- `cds compile --service all` no longer fails in case no services are found.
  This better matches higher level commands like `cds build` that should not fail in this instance.
  Note that `--service Foo` fails as before in case `Foo` is not found.
- `cds run` and `cds serve` now serve the generic index page at `/`, while previously this was `/$index`.
- `cds build/all` now auto-creates build tasks from `mta.yaml` definition if no build tasks have been
  defined in `.cdsrc.json`. If no `mta.yaml` file exists, cds configuration data respectively defaults
  are used for build task configuration.

### Fixed
- CLI now shows compilation warnings in all commands, e.g. in `build`, `deploy`, or `compile`.
  Previously warnings were only shown in case of compilation errors.
- `cds help` no longer inserts terminal escape sequences if stdout is redirected to a file.
- Errors in custom handlers are no longer shadowed in `cds serve` or `cds run`.

### Also see
- Changes of `@sap/cds-compiler` 1.13.4
- Changes of `@sap/cds-ql` 1.11.1
- Changes of `@sap/cds-reflect` 2.5.0
- Changes of `@sap/cds-services` 1.11.1
- Changes of `@sap/generator-cds` 2.4.8


## Version 3.9.0 - 2019-05-08

### Added
- `cds.serve` now reads passport for services from `auth.passport` configuration property

### Fixed
- `cds.compile` now really skips entities marked with `if-unused`
- Build tasks are now listed with `cds env`
- `cds serve` now supports the `--at`, `--to`, and `--with` arguments as specified.
- `cds deploy --to sqlite` now better handles csv files with empty values

### Also see
- Changes of `@sap/cds-compiler` 1.12.0
- Changes of `@sap/cds-ql` 1.10.2
- Changes of `@sap/cds-reflect` 2.5.0
- Changes of `@sap/cds-services` 1.10.2
- Changes of `@sap/generator-cds` 2.4.6


## Version 3.8.1 - 2019-04-30

### Fixed
- Texts in deep annotations, e.g. `@UI.Facet`, are now properly localized in OData metadata

## Version 3.8.0 - 2019-04-09

### Fixed
- Make tests run on Windows again
- Various fixes in `cds build/all`
- Adjustments to latest compiler for localizing models
- `.hdbcds` and `.hdbtabledata` files are now copied over in `cds build/all`

### Also see
- Changes of `@sap/cds-compiler` 1.11.0
- Changes of `@sap/cds-ql` 1.8.1
- Changes of `@sap/cds-services` 1.8.1
- Changes of `@sap/generator-cds` 2.4.4


## Version 3.7.1 - 2019-03-25

### Fixed
- `cds serve` now honors `newCsn` configuration when serving from precompiled csn.json files.
- `cds init` creates samples correctly when project already contains files.
- `cds build` for node.js projects will now show up compilation errors.  Formatting has been improved as well.
- Better support for finding `cds` executable in VSCode.


### Also see
- Changes of `@sap/cds-compiler` 1.10.0
- Changes of `@sap/cds-ql` 1.7.1
- Changes of `@sap/cds-services` 1.7.2
- Changes of `@sap/generator-cds` 2.4.4


## Version 3.6.0 - 2019-02-27

### Added
- In `cds init`:
  - Add modules via `cds init --modules` to an existing project.
  - Do not allow project creation via `cds init` outside of current working folder, e.g. init ../../some/where/else is not allowed.
  - No output at all (not even error messages) when using `cds init --quiet`.
  - Create a module folder using `cds init --modules...` even if it is empty based on the supplied options.
  - Parameter `--modules` only supports one folder of each type.
- Alpha support for `@cds.odata.valuelist`: Adding `@cds.odata.valuelist` to `@cds.autoexposed` entities will automatically equip all associations referring to such entities with a corresponding `@Common.ValueList.entity`

### Changed
- Simplified code lists: removed superfluous types `LanguageCode`, `CountryCode`, and `CurrencyCode` from `@sap/cds/common`
- `cds build/all` now does `--clean` by default and is less verbose in its output

### Fixed
- `cds.load` no longer fails if reading in a CSN file in version `0.1.0`

### Also see
- Changes of `@sap/cds-compiler` 1.9.0
- Changes of `@sap/cds-reflect` 2.4.0
- Changes of `@sap/cds-ql` 1.6.0
- Changes of `@sap/cds-services` 1.6.0
- Changes of `@sap/generator-cds` 2.4.0


## Version 3.5.2 - 2019-02-20

### Fixed
- Node.js projects created with `cds init` now
  - Bind the service module to an HDI service in `mta.yaml`.
  - Invoke CDS build when building the database module.
  - No longer create old-style `service` configuration in `package.json`.
- For datasources with kind `hana` we now also find `hanatrial` services in trial landscapes by matching their tag `hana`.


## Version 3.5.1 - 2019-02-14

### Fixed
- In `cds serve` service providers where added twice to the express app.  This is fixed.
- In the logs of `cds serve` false warnings on fiori requests are now gone.
- `cds serve` no longer fails on localization for unbound actions.
- The project template was fixed to properly wire up the connection to SAP HANA.

### Also see
- Changes of `@sap/cds-compiler` 1.8.1
- Changes of `@sap/cds-ql` 1.5.1
- Changes of `@sap/cds-services` 1.5.2
- Changes of `@sap/generator-cds` 2.3.7


## Version 3.5.0 - 2019-02-07

### Added
- `cds compile -2 xsuaa` now generates default values for `xsappname` and `tenant-mode`
- All commands now can be called with `--help`, where previously only `cds help <command>` was allowed.

### Changed
- The minimum required Node.js version is now set more specifically to _8.9_ LTS.  Previously, just Node.js 8 was mentioned.
- The `cds build/all` (experimental build command for Node.js) emits a warning for existing projects to add build task configuration.  Watch out for such a warning in the console and follow its instructions.

### Fixed
- Service handlers are now also found on CF if CDS models are served from a `csn.json` file instead as from `.cds` sources.
- An issue where projects w/o `db` dir could not be built using `cds build`.
- Unclear documentation of `cds deploy` on where it looks up the data source.
- `cds env` to load configuration profiles in lower-prio files (`.cdsrc.json`) with higher precedence than default configuration in higher-prio files (`package.json`).

### Also see
- Changes of `@sap/cds-compiler` 1.8.0
- Changes of `@sap/cds-reflect` 2.3.0
- Changes of `@sap/cds-ql` 1.5.0
- Changes of `@sap/cds-services` 1.5.0
- Changes of `@sap/generator-cds` 2.3.6

## Version 3.4.1 - 2019-01-24

### Fixed

- Restore cds-compiler `.version`

### Also see
- Changes of `@sap/cds-compiler` 1.7.1
- Changes of `@sap/cds-reflect` 2.2.1
- Changes of `@sap/cds-ql` 1.4.0
- Changes of `@sap/cds-services` 1.4.0
- Changes of `@sap/generator-cds` 2.2.0

## Version 3.4.0 - 2019-01-22

### Added

- `cds.env` supports loading from `default-env.json`
- Support base models for `cds compile -2 xsuaa`

### Also see
- Changes of `@sap/cds-compiler` 1.7.0
- Changes of `@sap/cds-reflect` 2.2.0
- Changes of `@sap/cds-ql` 1.4.0
- Changes of `@sap/cds-services` 1.4.0
- Changes of `@sap/generator-cds` 2.2.0

## Version 3.3.0 - 2019-01-11

### Also see
- Changes of `@sap/cds-compiler` 1.6.0
- Changes of `@sap/cds-reflect` 2.1.0
- Changes of `@sap/cds-ql` 1.3.0
- Changes of `@sap/cds-services` 1.3.0
- Changes of `@sap/generator-cds` 2.2.0

## Version 3.2.0 - 2018-12-21
### Changed
- cdsc 2sql output may also contain .types
- Add labels to CodeLists in common.cds
- Improved cds error messages

### Also see
- Changes of `@sap/cds-compiler` 1.6.0
- Changes of `@sap/cds-reflect` 2.1.0
- Changes of `@sap/cds-ql` 1.2.0
- Changes of `@sap/cds-services` 1.2.0
- Changes of `@sap/generator-cds` 2.2.0

## Version 3.1.1 - 2018-12-13
### Changed
- Better console output from cds compile

### Fixed
- cds.compile ignored configured odata.version

### Also see
- Changes of `@sap/cds-compiler` 1.6.0
- Changes of `@sap/cds-reflect` 2.1.0
- Changes of `@sap/cds-ql` 1.1.0
- Changes of `@sap/cds-services` 1.1.0
- Changes of `@sap/generator-cds` 2.2.0

## Version 3.0.0
### Changed
- Reworked configuration options to center around required 'data sources'.
  - As an example see the snippted that e.g. `cds deploy --to sqlite:my.db` generates into `package.json`.
  - The former `cds` options from `package.json` are deprectated but still supported.
- Clean up of many Node.js APIs, mainly for `cds.serve` and `cds.connect`.  See the [Javacript APIs documentation](https://help.sap.com/viewer/65de2977205c403bbc107264b8eccf4b/Cloud/en-US/a131984aefe94ff884e6b6819ee76bd9.html) for details.
- Node.js 8 is now the minimum required runtime version.
- Simplified `cds init`.  By default it creates a plain project suitable for local CDS development.

### Added
- `cds env` allows for inspecting the effective configuration

### Also see
- Changes of `@sap/cds-compiler` 1.5.0
- Changes of `@sap/cds-reflect` 2.0.0
- Changes of `@sap/cds-ql` 1.0.0
- Changes of `@sap/cds-services` 1.0.0
- Changes of `@sap/generator-cds` 2.0.0

## Version 2.11.2
### Fixes
- During `cds init/new` only install `@sap/generator-cds` 1.x

## Version 2.11.0
### Added
- Reuse aspect `cuid` to `@sap/cds/common`
- Support for smart to-many Associations finding backlinks automatically (&rarr;not for production!)
- Support to fill DBs with initial data from CSV files (fetched from folder `db/csv/`)
- New CLI command `cds run` - today a mere wrapper for `cds serve all` but meant to serve microservice test scenarios
- `cds deploy` can be configured not to modify `package.json` through the `--no-save` option.

### Also see
- Changes of `@sap/cds-compiler` 1.2.0
- Changes of `@sap/cds-reflect` 1.8.0
- Changes of `@sap/cds-ql` 0.12.0
- Changes of `@sap/cds-services` 0.12.0

## Version 2.10.3
### Fixes
- During `cds init/new` only install `@sap/generator-cds` 1.x

## Version 2.10.0
### Added
- Support for Fiori Draft

### Fixes
- Enhanced server.js to also include links to entities

### Also see
- Changes of `@sap/cds-compiler` 1.1.3
- Changes of `@sap/cds-reflect` 1.7.0
- Changes of `@sap/cds-ql` 0.11.0
- Changes of `@sap/cds-services` 0.11.0

## Version 2.9.1
### Fixes
- `cds build` no longer blocks if running inside a Maven build.

## Version 2.9.0
### Added
- `common.cds` model got annotations for title, description, and value lists.
- `cds` executable now can read from stdin, e.g. `echo 'entity Foo {ID:UUID;}' | cds -2 sql`
- `cds -2 sql` now outputs plain (non-HANA) SQL.  Use `-2 hana` for HANA SQL.
- `cds config` shows the current CDS configuration.  Use `cds help config` to learn more.

### Fixes
- Entities from `common.cds` like `Languages`, `Countries`, and `Currencies` are now only persisted to the database if they are actually used.

### Also see
- Changes of `@sap/cds-compiler` 1.1.2
- Changes of `@sap/cds-reflect` 1.6.0
- Changes of `@sap/cds-ql` 0.10.0
- Changes of `@sap/cds-services` 0.10.1

## Version 2.8.0
### Added
- Support was added to build node.js service modules
- `cds init` has been reimplemented with a better commandline experience, along with updated templates.  Plugin `@sap/generator-cds`, which is required for `cds init`, is now automatically installed when `init` is called for the first time.  `cds new` is still available and is now just a synonym for `init`.

### Also see
- Changes of `@sap/cds-compiler` 1.1.1
- Changes of `@sap/cds-services` 0.9.0
- Changes of `@sap/cds-ql` 0.9.0

## Version 2.7.0
### Also see
- Changes of `@sap/cds-compiler` 1.0.32
- Changes of `@sap/cds-services` 0.8.1
- Changes of `@sap/cds-ql` 0.8.1

## Version 2.6.0
### Also see
- Changes of `@sap/cds-compiler` 1.0.31
- Changes of `@sap/cds-services` 0.7.0
- Changes of `@sap/cds-ql` 0.7.0

## Version 2.5.1
### Also see
- Changes of `@sap/cds-services` 0.6.0
- Changes of `@sap/cds-ql` 0.6.0

## Version 2.5.0
### Added
- Instead of compiling each `.cds` service file separately, `cds build` now combines all those files from the same folder, creating only one `csn.json` file for them.

### Fixes
- Shortcuts of `cds init` work again

### Also see
- Changes of `@sap/cds-compiler` 1.0.30
- Changes of `@sap/cds-services` 0.5.0
- Changes of `@sap/cds-ql` 0.5.0

## Version 2.4.2
Same as version 2.3.2, but including the generic service provider for Node.js (`@sap/cds-services` and `@sap/cds-ql`).

## Version 2.3.2
### Changed
- The default for SQL name mapping is changed to `plain`.  This means that
  - The name of a table/view in the database catalog is obtained from the name of the corresponding entity in the CDS model in the following way:
    - replace all "." by "_"
    - convert everything to upper case
  - The name of a table/view column in the database catalog is obtained from the name of the corresponding entity element in the csn in the following way:
    - convert everything to upper case

  Note that this is a breaking change for appliations that rely on the previous value of `quoted`.  In order to get this value back, add the following to `package.json`: `"cds": { "data": { "sql_mapping" : "quoted" } }`

### Fixes
- Special output formatting in CLI is only done for `cds eval` and `cds repl`, but not for programmatic usage.
- Links to external documentation are now point to correct help documents.

### Also see
- Changes of `@sap/cds-compiler` 1.0.30


## Version 2.3.0
### Added
- SQL names can now be configured with `{ data: {sql_mapping: "plain/quoted"} }`.  Default is `quoted`, but will be changed to `plain` soon.  If you need to stay with `quoted` in the futute, e.g. due to data compatibility reasons, you can configure this mode already now.

### Fixes
- The `csn.json` file produced by `cds build` now contains the properly unfolded model for OData.  Previously this was the normalized model, which led to runtime errors in the Java service provider.
- Invalid configuration data in `package.json` now leads to a build error again.
- Console output of `cds build` now presents files paths sorted.

### Also see
- Changes of CDS compiler 1.0.27


## Version 2.2.0
### Added
- CDS configuration in `package.json` can now be omitted if you follow the standard project layout, i.e. if you place your model files in `db/`, `srv/`, and `app/` folders.

### Changed
- Previously data models needed to include import statements to the service models (e.g. `using from '../srv'`), so that the Java runtime could use these service views on the DB to execute queries.  The views are now included automatically, so that you can remove the explict `using` clauses.
- Calling just `cds` on the command line now prints its help.  The previously started REPL is now available with `cds repl` (or just `cds r`).

### Fixes
- Some cds commands failed on Windows.  This is fixed.

### Also see
- Changes of CDS compiler 1.0.24


## Version 2.1.0
### Added
- Service edmx files are now written to UI app folders if their manifest.json contains a reference to the service.  This allows Web IDE's annotation modeler to work on up to date service files.
- The results of `cds.compile.to...` commands are now automatically formatted if called in `cds -e...` or cds repl.  You don't need to append `console.log` to the call chain.

### Fixes
- Language properties are now found in all folders, also ones that are outside of the current module
- csn.json is written with line breaks and indentation

### Also see
- Changes of CDS compiler 1.0.21

## Version 2.0.0
### Added
- All-new command-line interface.  See `cds help` for information on the available commands.
- `cds compile` exposes CDS model transformations with various options.
- `cds build` automatically writes localized edmx files.
- `cds build` now writes the version to the build log.
- `cds version` does the usual thing.
- `cds init` scaffolds CDS projects.
- CDS repl (read-eval-print-loop): just type `cds` and play with CDS API.

### Fixes
Too many to mention :)

### Also see
- Changes of CDS compiler 1.0.19