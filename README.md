# sfdx-raven

A plugin for the Salesforce CLI built by Tom Carman. I plan to add to this over time.

## Setup

## Quick Install
Assuming you already have the [SDFX CLI](https://developer.salesforce.com/docs/atlas.en-us.sfdx_setup.meta/sfdx_setup/sfdx_setup_install_cli.htm) installed, just run:

`sfdx plugins:install sfdx-raven`

Note: You'll be prompted that this is not officially code-signed by Salesforce - like any custom plugin. You can just accept this when prompted, or alternatively you can [whitelist it](https://developer.salesforce.com/blogs/2017/10/salesforce-dx-cli-plugin-update.html)

## Install from source
1. Install the [SDFX CLI](https://developer.salesforce.com/docs/atlas.en-us.sfdx_setup.meta/sfdx_setup/sfdx_setup_install_cli.htm)
2. Clone the repository: `git clone git@github.com:tomcarman/sfdx-raven.git`
3. Install npm modules: `npm install`
4. Link the plugin: `sfdx plugins:link .`


## Compatibility
* **macOS**
  * Plugin has been built on macOS and will always run on macOS
  
* **Windows**
  * Work on Windows 10 1803+ (this is that latest build I have access to)
  * Known Issues:
    * Emoji will not work in cmd.exe / powershell - so you may seem some funny characters when running the plugin - this can be ignored. Emoji may work in Windows Terminal, but I have not managed to test yet
      
* **Linux**
  * Only tested on an Ubuntu installation on [WSL](https://docs.microsoft.com/en-us/windows/wsl/about), but should work.


## Commands

- [sfdx raven:utils:dashboarduser:update](#sfdx-ravenutilsdashboarduserupdate)


## sfdx raven:utils:dashboarduser:update

Updates the "Running User" of Dashboards from a given user, to an alternate given user. Useful for mass-updating Dashboards when a user is deactivated.

```
USAGE
  $ sfdx raven:utils:dashboarduser:update

OPTIONS
  -u, --targetusername    sets a username or alias for the target org. overrides the default target org.
  -f, --from              the username of the user which is currently the 'running user' of the Dashboards eg. 'tom.carman@ecorp.com'
  -t, --to.               the username of the user which you want to make the new 'running user' of the Dashboards eg. 'james.moriarty@ecorp.com'
  -, --help               show CLI help
  --json                  format output as json
  --loglevel              logging level for this command invocation

EXAMPLES
  $ sfdx raven:utils:dashboarduser:update -u ecorp-dev --from tom.carman@ecorp.com --to james.moriarty@ecorp.com`
```
