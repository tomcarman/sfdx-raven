import { flags, SfdxCommand } from '@salesforce/command';
import { AnyJson } from '@salesforce/ts-types';
import { CliUx } from '@oclif/core';
import * as fs from 'fs';
import util = require('util');
import child_process = require('child_process');

const path = require('path');
const replace = require('replace');
const extract = require('extract-zip')
const exec = util.promisify(child_process.exec);
const emoji = require('node-emoji');


export default class Updates extends SfdxCommand {

  // Load messages
  public static description = 'Mass update the Running User for Dashboards';

  // Example usage
  public static examples = [
  `$ sfdx raven:utils:dashboarduser:update -u ecorp-dev --from tom.carman@ecorp.com --to james.moriarty@ecorp.com`
  ];

  // Define flags
  protected static flagsConfig = {
    from: flags.string({char: 'f', description: 'The username of the current Dashboard running user eg. tom.carman@ecorp.com'}),
    to: flags.string({char: 't', description: 'The username of the target Dashboard running user eg. james.moriarty@ecorp.com'})
  };

  // Set some parameters
  protected static requiresUsername = true; // Force the user to supply an org
  protected static supportsDevhubUsername = true; // The org could be a DevHub
  protected static requiresProject = false; // This command does not require a project


  public async run(): Promise<AnyJson> {

    /* Setup */

    interface User {
        Id: string;
        Username: string;
        FirstName: string;
        LastName: string;
      }

    interface QueryResult {
        totalSize: number;
        done: boolean;
        records: Record[];
    }

    interface Record {
        attributes: object;
        Id: string;
    }

    // Get salesforce connection
    const conn = this.org.getConnection(); // this.org is guaranteed because requiresUsername=true, as opposed to supportsUsername

    // Get usernames from arguments
    let fromUsername = this.flags.from;
    let toUsername = this.flags.to;

    // Check if sandbox
    const sandboxQuery = 'SELECT IsSandbox FROM Organization LIMIT 1';
    const sandboxResult = await conn.query<QueryResult>(sandboxQuery);
    const isSandbox = sandboxResult.records[0]['IsSandbox'];

    // Retrieve the users from the org    
    this.ux.log('\n');
    CliUx.ux.action.start(`${emoji.get('male-detective')} Retrieving users`);

    const userIdQuery = `SELECT Id, Username, FirstName, LastName FROM User WHERE (Username = \'${fromUsername}\' OR Username = \'${toUsername}\')`
    const users = await conn.query<User>(userIdQuery);

    let userIdMap = new Map();

    for(let user of users.records) {
        if(user.Username == fromUsername) {
            userIdMap.set('fromUserId', user);
        } else if(user.Username == toUsername) {
            userIdMap.set('toUserId', user);
        }
    }

    // Error handling if users not found
    let usersNotFound = false;
    let userErrorMessage = '';

    if(!userIdMap.has('fromUserId')) {
        usersNotFound = true;
        userErrorMessage += `\n There was no user found matching the username: ${fromUsername}`;
    }

    if(!userIdMap.has('toUserId')) {
        usersNotFound = true;
        userErrorMessage += `\n There was no user found matching the username: ${toUsername}`;
    }

    if(usersNotFound) {
        CliUx.ux.action.stop();
        this.ux.log(userErrorMessage);
        this.ux.log('\nAborted');
        return;
    }

    const fromUserId = userIdMap.get('fromUserId').Id;
    // const toUserId = userIdMap.get('toUserId').Id;
    const fromUserRealName = `${userIdMap.get('fromUserId').FirstName} ${userIdMap.get('fromUserId').LastName}`
    const toUserRealName = `${userIdMap.get('toUserId').FirstName} ${userIdMap.get('toUserId').LastName}`

    CliUx.ux.action.stop();


    /* Retrieve the list of Dashboards to be updated*/

    CliUx.ux.action.start(`${emoji.get('clipboard')} Generating a list of Dashbords owned by ${fromUserRealName}`);

    const dashboardQuery = `SELECT Id, DeveloperName, Folder.DeveloperName FROM Dashboard WHERE RunningUserId = \'${fromUserId}\'`;
    const dashboards = await conn.query<QueryResult>(dashboardQuery);

    CliUx.ux.action.stop();

    //Return if no dashboards found
    if(dashboards.totalSize == 0) {
        this.ux.log(`\nThere are no Dashboards with ${fromUserRealName} as the \'Running User\'`)
        this.ux.log('\n Aborted');
        return;
    }


    // Show the Dashboards back to cli, and prompt for confirmation
    this.ux.log(`\nThe following Dashboards will have their \'Running User\' changed from ${fromUserRealName} to ${toUserRealName}:\n`);
    this.ux.table(dashboards.records, ['Id', 'Folder.DeveloperName', 'DeveloperName']);

    let confirmUpdate = await CliUx.ux.confirm('\nDo you want to continue? y/n');

    if(!confirmUpdate) {
        this.ux.log('Aborted');
        return;
    }


    /* Build the package.xml*/
    this.ux.log('\n');
    CliUx.ux.action.start(`${emoji.get('card_index_dividers')}  Generating a package.xml for the Dashbords owned by ${fromUserRealName}`);

    // Define name of temporary folder and package.xml
    let packageDir = path.resolve('./temp');
    let packageManifest = 'package.xml'

    // Create the temporary directory
    if(!fs.existsSync(packageDir)) {
        fs.mkdirSync(packageDir);
    }

    // Begin constructing the package.xml
    let packageFile = fs.createWriteStream(`${packageDir}/${packageManifest}`);
    packageFile.write('<?xml version="1.0" encoding="UTF-8"?>');
    packageFile.write('\n<Package xmlns="http://soap.sforce.com/2006/04/metadata">');
    packageFile.write('\n<types>');

    // Add the Dashboards that were retrieved
    for(let dashboard of dashboards.records) {
        packageFile.write(`\n<members>${dashboard['Folder'].DeveloperName}/${dashboard['DeveloperName']}</members>`);
    }

    packageFile.write('\n<name>Dashboard</name>');
    packageFile.write('\n</types>');
    packageFile.write('\n<version>45.0</version>');
    packageFile.write('\n</Package>');
    packageFile.close();

    CliUx.ux.action.stop();


    /* Retrieve Dashboad metadata */

    CliUx.ux.action.start(`${emoji.get('arrow_double_down')} Retrieving Dashboard metadata`);
    const retrieveCommand = `sfdx force:mdapi:retrieve -k ${packageDir}/${packageManifest} -u ${this.org.getUsername()} -r ${packageDir}`;

    try {
        await exec(retrieveCommand)
    } catch (err) {
        this.ux.log(err);
        return;
    }

    CliUx.ux.action.stop();


    // Unzip metadata to temporary directory 
    CliUx.ux.action.start(`${emoji.get('open_file_folder')} Unzipping metadata`)

    try {
        await extract(path.join(packageDir, '/unpackaged.zip'), { dir: packageDir })
      } catch (err) {
          this.ux.log(err);
      }
    
    CliUx.ux.action.stop();
    

    /* Patch the Dashboard metadata files, to replace Running User from the old user to the new one */

    CliUx.ux.action.start(`${emoji.get('bar_chart')} Patching the Dashboard metadata`)

    // Walk through the files (using async iterator)
    async function* walk(packageDir) {
        // @ts-ignore
        for await (const d of await fs.promises.opendir(packageDir)) {
            const entry = path.join(packageDir, d.name);
            if (d.isDirectory()) {
                yield* await walk(entry);
            } else if (d.isFile()) {
                yield entry;
            }
        }
    }

    let dashboardfiles = [];

    for await (const p of walk(packageDir)) {
        if(path.extname(p) == '.dashboard') {
            dashboardfiles.push(p);
        }
    }

    // Check if sandbox, as if so we need to remove the sbox extension from usernames, as Dashboard Running User username 
    // is always in the base form
    if (isSandbox) {
        fromUsername = fromUsername.replace(/\.[^/.]+$/, "");
        toUsername = toUsername.replace(/\.[^/.]+$/, "");
    }

    let oldValue = `<runningUser>${fromUsername}</runningUser>`
    let newValue = `<runningUser>${toUsername}</runningUser>`
    
    // Replace the username in all files
    replace({
        regex: oldValue,
        replacement: newValue,
        paths: dashboardfiles,
        recursive: true,
        silent: true,
      });

    CliUx.ux.action.stop();

    // Confirm that the user wants to deploy
    let confirmDeploy = await CliUx.ux.confirm(`\nDo you want to deploy the patched Dashboards back to the org?
If you choose no, the patched files will still be in a folder called /temp which you can manually deploy y/n`);

    if(!confirmDeploy) {
        this.ux.log('\nFiles patched, but not deployed.');
        return;
    }


    /* Deploy the patched Dashboard metadata back to the org */
    
    this.ux.log('\n');
    CliUx.ux.action.start(`${emoji.get('arrow_double_up')} Deploying the Dashboard metadata`)
    const deployPath = path.join(packageDir, 'unpackaged');
    const deployCommand = `sfdx force:mdapi:deploy -d ${deployPath} -u ${this.org.getUsername()}`;

    try {
        await exec(deployCommand);
    } catch (err) {
        CliUx.ux.action.stop();
        this.ux.log(err);
        return;
    }

    CliUx.ux.action.stop();


    /* Clean up the temporary files */

    CliUx.ux.action.start(`${emoji.get('sparkles')} Cleaning up`)
    
    try {
        // @ts-ignore
        fs.rmdirSync(packageDir, { recursive: true });
    } catch (err) {
        this.ux.log(err);
    }

    CliUx.ux.action.stop();

    this.ux.log(`${emoji.get('white_check_mark')} Deployment Successful`);
  }

}