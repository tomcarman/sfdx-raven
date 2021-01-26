import { flags, SfdxCommand } from '@salesforce/command';
import { AnyJson } from '@salesforce/ts-types';
import { cli } from 'cli-ux';
import simpleGit, { SimpleGit, StatusResult } from 'simple-git';
import util = require('util');
import child_process = require('child_process');

const path = require('path');
const exec = util.promisify(child_process.exec);


export default class Branch2Sbox extends SfdxCommand {

  public static description = 'Deploy a branch to a sandbox';

  public static examples = [
  `$ sfdx raven:utils:deploy:branch2sbox -r git@github.com:user/some-repo.git -b branchName -u orgName`
  ];
  
  protected static requiresUsername = true;
  protected static supportsDevhubUsername = true;
  protected static requiresProject = false;

  protected static flagsConfig = {
    repository: flags.string({
        char: 'r', description: 'The repo',required: true
    }),
    branch: flags.string({
        char: 'b', description: 'The branch', required: true
    })
  };

  public async run(): Promise<AnyJson> {

    // Clone & checkout repo
    this.ux.log('\n')
    cli.action.start('Cloning repo & checking out \'' + this.flags.branch+'\'');
    
    const git: SimpleGit = simpleGit();

    try {
        await git.clone(this.flags.repository, '.', ['-b', this.flags.branch]);
        cli.action.stop();

    } catch (e) { 
        cli.action.stop('Error');
        this.ux.log(e);

    }


    // Convert to mdapi format
    cli.action.start('Converting from source format to metadata format');
    let packageDir = path.resolve('./packageToDeploy');
    const convertCommand = `sfdx force:source:convert --outputdir ${packageDir}`;

    try {
        await exec(convertCommand);
        cli.action.stop();

    } catch (e) {
        cli.action.stop('Error');
        this.ux.log(e);
    }



    // Deploy to org
    cli.action.start('Initiating deployment');
    const deployCommand = `sfdx force:mdapi:deploy -d ${packageDir} -u ${this.org.getUsername()} --json`;

    let deploymentId;

    try {

        let response = await exec(deployCommand);
        let responseJson = JSON.parse(response.stdout);
        cli.action.stop();

        deploymentId = responseJson.result.id;
        this.ux.log(`\nThe deployment has been requested with id: ${deploymentId}\n`);

    } catch (e) {
        cli.action.stop('Error');
        this.ux.log(e);
    }


    // Monitor deployment progress
    const reportCommand = `sfdx force:mdapi:deploy:report -i ${deploymentId} -u ${this.org.getUsername()} --json`;

    let completed = false;

    while (!completed) {

        try {

            let response = await exec(reportCommand);
            let responseJson = JSON.parse(response.stdout);
            completed = responseJson.result.done;
            let status = responseJson.result.status;
            
            let output = `Deployment ${status}`;

            if(status == 'InProgress') {
                output+=` (${responseJson.result.numberComponentsDeployed}/${responseJson.result.numberComponentsTotal}) ${responseJson.result.stateDetail}`
            }

            this.ux.log(output);

        } catch(failedResponse) {

            let failedResponseJson = JSON.parse(failedResponse.stdout);
            completed = failedResponseJson.result.done;

            let componentErrors = failedResponseJson.data.details.componentFailures;

            let output = `\nFailed with ${failedResponseJson.result.numberComponentErrors} errors.\n`;

            this.ux.log(output);
            this.ux.table(componentErrors, ['componentType', 'fullName', 'problemType', 'problem']);
        }
    
    }

    let baseUrl = this.org.getConnection().instanceUrl;
    let deploymentUrlPath = '/lightning/setup/DeployStatus/page?address=%2Fchangemgmt%2FmonitorDeploymentsDetails.apexp%3FasyncId%3D';
    this.ux.log(`\nLink to deployment page in Salesforce:\n${baseUrl}${deploymentUrlPath}${deploymentId}`);

  }

}
