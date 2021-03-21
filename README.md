# sfdx-raven

A plugin for the Salesforce CLI built by Tom Carman. 

Mostly just quality of life automations/scripts to make recurring tasks less timeconsuming.

Slowly adding commands over time. See [Todo](#Todo) for whats likely coming next.

## Commands

See further down for full details, usage, examples etc.


#### Info
* [sfdx raven:info:fields](#sfdx-raveninfofields)
  * Show all field labels, API names & types for a given object
* [sfdx raven:info:recordtypes](#sfdx-raveninforecordtypes)
  * Show all RecordType labels, API names & Ids for a given object

#### Utils 
* [sfdx raven:utils:deploy:branch2org](#sfdx-ravenutilsdeploybranch2org)
  * Deploy a git branch to an org
* [sfdx raven:utils:diff](#sfdx-ravenutilsdiff)
  * Diff individual metadata items (class, object etc) between orgs
* [sfdx raven:utils:event:listen](#sfdx-ravenutilseventlisten)
  * Listen to platform events from cli
* [sfdx raven:utils:dashboarduser:update](#sfdx-ravenutilsdashboarduserupdate)
  * Change the running user of Dashboards


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
    * I don't think 'diff' is available on windows cli, so `sfdx:raven:utils:diff` is not likely to work.
      
* **Linux**
  * Only tested on an Ubuntu installation on [WSL](https://docs.microsoft.com/en-us/windows/wsl/about), but should work.


## Todo
The following is a list of commands/features I would like to add to this plugin. Pull requests are welcome!
* Datamover - *_in progress_*
  * Move data from one org to another based on a provided SOQL
  * Typically would be used between prod -> sbox or sbox -> sbox
  * Allow the user to specify an "all wildcard" SOQL - eg. `SELECT * FROM Account`. This would dynamically query the object metada, create a list of fields, remove any read-only fields (formulas, audit etc), and then build a SOQL with the remaining fields and use that for the data move.
* Audit Trail inspector
  * Allow you to quickly search audit trail by username, metadata item, most recent 50 etc.
* Package2ChangeSet
  * Create a function that allows you to quickly create a ChangeSet or add to an existing ChangeSet based on an inputted package.xml.   



## sfdx raven:info:fields

Returns a list of fields (Label, DeveloperName, Data Type) for a given SObject

```
USAGE
  $ sfdx raven:info:fields

OPTIONS
  -u, --targetusername    
      (required) sets a username or alias for the target org. overrides the default target org.
  
  -o, --object            
      (required) the username of the user which is currently the 'running user' of the Dashboards eg. 'tom.carman@ecorp.com'
  
  -h, --help              
      show CLI help
 
  --json                  
      format output as json

  --loglevel              
      logging level for this command invocation

EXAMPLE
  $ sfdx raven:info:fields -u ecorp-dev -o Account

OUTPUT

LABEL                 QUALIFIED API NAME    DATA TYPE
────────────────────  ────────────────────  ──────────────────────────
Account Number        AccountNumber         Text(40)
Account Source        AccountSource         Picklist
Annual Revenue        AnnualRevenue         Currency(18, 0)
Billing Address       BillingAddress        Address
Created By            CreatedById           Lookup(User)
...
```

## sfdx raven:info:recordtypes

Returns a list of RecordTypes (Label, DeveloperName, Id) for a given SObject

```
USAGE
  $ sfdx raven:info:recordtypes

OPTIONS
  -u, --targetusername    
      (required) sets a username or alias for the target org. overrides the default target org.

  -o, --object            
      (required) the username of the user which is currently the 'running user' of the Dashboards eg. 'tom.carman@ecorp.com'

  -h, --help              
      show CLI help

  --json                  
      format output as json

  --loglevel              
      logging level for this command invocation

EXAMPLE
  $ sfdx raven:info:recordtypes -u ecorp-dev -o Account

OUTPUT

NAME                 DEVELOPER NAME       ID
───────────────────  ───────────────────  ──────────────────
Customer             Customer             0121U000000uAAAXXX
Organistation        Organisation         0121U000000uBBBXXX
Primary Supplier     Primary_Suppier      0121U000000uCCCXXX
...
```

## sfdx raven:utils:deploy:branch2org

Deploys a git branch to an org. Assumes you have git installed the neccessary access to the repo you are trying to clone (eg. you can run `git clone ...`), and that the branch is in a source-format sfdx project structure.

```
USAGE
  $ sfdx raven:utils:deploy:branch2org

OPTIONS
  -u, --targetusername    
      (required) sets a username or alias for the target org that you wish to deploy to. overrides the default target org.
 
  -r, --repository        
      (required) URL of the repo. It can either be an HTTPs URL (eg. 'https://github.com/user/some-repo.git') and you
      will be prompted to enter a username and password, or an SSH URL (eg. 'git@github.com:user/some-repo.git')
      which assumes you have SSH keys configured for this repo.
 
  -b, --branch            
      (required) the branch you wish to deploy
 
  -c, --checkonly         
      (optional) Validates the deployed metadata and runs all Apex tests, but prevents the 
      deployment from being saved to the org.
 
  -h, --help              
      show CLI help
 
  --json                  
      format output as json
 
  --loglevel              l
      ogging level for this command invocation

EXAMPLE
  $ sfdx raven:utils:deploy:branch2org -r git@github.com:user/some-repo.git -b branchName -u orgName`
  or
  $ sfdx raven:utils:deploy:branch2org -r https://github.com/user/some-repo.git -b branchName -u orgName`


OUTPUT

❯ Cloning repo & checking out 'branchName'... done
❯ Converting from source format to metadata format... done
❯ Initiating deployment... done

❯ The deployment has been requested with id: 0Af4K00000BHVuAXXX

❯ Deployment InProgress (0/31) Processing Type: CustomObject
❯ Deployment InProgress (21/31) Processing Type: CustomTab
❯ Deployment InProgress (30/31) Processing Type: Profile
❯ Deployment Succeeded

❯ Link to deployment page in Salesforce:
https://wise-hawk-22uzds-dev-ed.my.salesforce.com/lightning/setup/DeployStatus/page?address=%2Fchangemgmt%2FmonitorDeploymentsDetails.apexp%3FasyncId%3D0Af4K00000BHVuASAX
```

## sfdx raven:utils:diff

Allows you to quickly compare metadata of files between two orgs. Intended to be used for quick compares of single
(or possibly a few) files of the same metadata type, rather than a full org compare (there are better tools for
that) The results are stored in a diff_{timestamp}.html file wherever you run the command from, and automatically
opened in a browser.

```
USAGE
  $ sfdx raven:utils:diff -s <string> -t <string> -o <string> -i <string> [--filename <string>] [-f <string>]
  [--silent] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]

OPTIONS
  -f, --format=format
      (optional) Format of the diff. Options are 'line' (inline diff) or 'side' (side-by-side diff). Defaults to 'line'

  -i, --items=items
      (required) The items you wish to compare eg. MyCoolClass or Account. Can be multiple items comma delimted eg.
      MyClass,MyController or Account,Opportunity (but can only be of one 'type')

  -o, --type=type
      (required) The type of metadata you want to compare eg. ApexClass or CustomObject

  -s, --source=source
      (required) Alias / Username of the org you want to use as the SOURCE of the diff eg. projectDev

  -t, --target=target
      (required) Alias / Username of the org you want to use as the TARGET of the diff eg. projectQA

  --filename=filename
      (optional) The filename of the diff.html. Defaults to diff_{timestamp}.html

  --json
      format output as json

  --loglevel=(trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL)
      [default: warn] logging level for this command invocation

  --silent
      use this to not auto open browser with results

EXAMPLES
  $ sfdx raven:utils:diff --source dev_org --target qa_org --type CustomObject --items Account
  $ sfdx raven:utils:diff --source dev_org --target qa_org --type CustomObject --items 'Account,Opportunity'
  $ sfdx raven:utils:diff --source dev_org --target qa_org --type ApexClass --items MyClass
  $ sfdx raven:utils:diff --source dev_org --target qa_org --type ApexClass --items 'MyClass,MyTestClass,MyController
  $ sfdx  raven:utils:diff -s dev_org -t qa_org -o CustomObject -i 'Account'
  $ sfdx  raven:utils:diff -s dev_org -t qa_org -o ApexClass -i 'MyClass'
  $ sfdx  raven:utils:diff -s dev_org -t qa_org -o ApexClass -i 'MyClass' --silent

OUTPUT

❯ sfdx raven:utils:diff --source trailhead --target dev --type ApexClass --items 'HelloWorld'
🗂️  Building package.xml... done
⏬ Retrieving from trailhead... done
⏬ Retrieving from dev... done
📂 Unzipping metadata... done
👨‍🍳 Preparing diff... done
✨ Cleaning up... done
🌐 Opening with diff2html in browser... done
```
<img width="795" alt="diff" src="https://user-images.githubusercontent.com/1554713/111902572-057edf80-8a36-11eb-8c45-56c09c290e89.png">


## sfdx raven:utils:event:listen

Subscribe to a Platform Event and get events published to your cli without using the clunky java [EMPConnector](https://github.com/forcedotcom/EMP-Connector)

```
USAGE
  $ sfdx raven:utils:event:listen -e <string> [-r <integer>] [-t <number>] [-u <string>]

OPTIONS
  -e, --event=event         
      (required) The name of the Platform Event that you want to subscribe with '/event' prefix  eg. /event/My_Event__e

  -r, --replayid=replayid   
      (optional) The replay id to replay events from eg. 21980378
  
  -t, --timeout=timeout     
      (optional) How long to subscribe for before timing out in minutes eg. 10. Default is 3 minutes
  
  -u, --targetusername      
      (required) sets a username or alias for the target org that you wish to deploy to. overrides the default target org.
 
  -h, --help                
      show CLI help
 
  --json                    
      format output as json
 
  --loglevel                
      logging level for this command invocation

EXAMPLES
  $ sfdx raven:utils:event:listen -u myorg -e /event/My_Event__e
  $ sfdx raven:utils:event:listen -u myorg -e /event/My_Event__e --replayid 21980378
  $ sfdx raven:utils:event:listen -u myorg -e /event/My_Event__e --timeout 10
  $ sfdx raven:utils:event:listen -u myorg -e /event/My_Event__e -r 21980378 -t 10

OUTPUT

❯ 🔌 Connecting to org... done
❯ 📡 Listening for events...

{
  "schema": "XdDXhymeO5NOxuhzFpgDJA",
  "payload": {
    "Some_Event_Field__c": "Hello World",
    "CreatedDate": "2021-03-15T19:16:54.929Z",
  },
  "event": {
    "replayId": 21980379
  }
}
```

## sfdx raven:utils:dashboarduser:update

Updates the "Running User" of Dashboards from a given user, to an alternate given user. Useful for mass-updating Dashboards when a user is deactivated.

You will have the following additional options when running -

* A list of Dashboards that will be affected as part of the script will be displayed, with the option to abort if desired.
* The final step to deploy the changes back to the org can be skipped when prompted, allowing for the manual deploy of the patched metadata files - this might be desirable when running against Production environments with strict deployment practices, or if you maintain Dashboard metadata in source control and want to commit the files.

```
USAGE
  $ sfdx raven:utils:dashboarduser:update

OPTIONS
  -u, --targetusername   
      (required) sets a username or alias for the target org. overrides the default target org.
 
  -f, --from              
      (required) the username of the user which is currently the 'running user' of the Dashboards eg. 'tom.carman@ecorp.com'
 
  -t, --to.               
      (required) the username of the user which you want to make the new 'running user' of the Dashboards eg. 'james.moriarty@ecorp.com'
 
  -h, --help              
      show CLI help
 
  --json                  
      format output as json
 
  --loglevel              
      logging level for this command invocation

EXAMPLE
  $ sfdx raven:utils:dashboarduser:update -u ecorp-dev --from tom.carman@ecorp.com --to james.moriarty@ecorp.com`
```
