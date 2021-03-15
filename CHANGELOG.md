# Change Log
All notable changes to this project will be documented in this file.
 
The format is based on [Keep a Changelog](http://keepachangelog.com/)
and this project adheres to [Semantic Versioning](http://semver.org/).

## [0.0.9] - 2021-03-15 - Add commands
 
### Added
* `sfdx raven:utils:event:listen` command was added. Used to listen to Platform Events.

### Changed
* Removed some no longer needed dependencies (cometd-nodejs-client)
* Updated README
 
### Fixed
* N/A 

## [0.0.8] - 2021-02-02 - Update commands
 
### Added
* N/A 

### Changed
* `sfdx raven:utils:deploy:branch2org` command was updated to allow for validate only deployments with use of the -c / --checkonly flag.
 
### Fixed
* N/A 

## [0.0.7] - 2021-02-01 - Update commands
 
### Added
* N/A 

### Changed
* `sfdx raven:utils:deploy:branch2org` command was updated to allow for git authentication via https username/password rather than just ssh. 
 
### Fixed
* N/A 

## [0.0.6] - 2021-01-26 - Add commands
 
### Added
* `sfdx raven:utils:deploy:branch2org` command was added. Used to deploy a git branch to an org

### Changed
* N/A
 
### Fixed
* N/A 
   
## [0.0.5] - 2020-11-04 - Add commands
 
### Added
* `sfdx raven:info:fields` command was added. Used to quickly see a list of fields for a given SObject.
* `sfdx raven:info:recordtypes` command was added. Used to quickly see a list of RecordTypes for a given SObject.
   
### Changed
* N/A
 
### Fixed
* N/A 
 
## [0.0.4] - 2020-11-03 - Initial release
 
### Added
* `sfdx raven:utils:dashboarduser:update` command was added. This can be used to mass change the "Running User" of Dashboards.
   
### Changed
* N/A
 
### Fixed
* N/A
