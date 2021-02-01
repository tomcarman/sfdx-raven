import { flags, SfdxCommand } from '@salesforce/command';
import { AnyJson } from '@salesforce/ts-types';
import { cli } from 'cli-ux';
import simpleGit from 'simple-git';
import util = require('util');
import child_process = require('child_process');

const path = require('path');
const exec = util.promisify(child_process.exec);


export default class Branch2Org extends SfdxCommand {

  public static description = 'Deploy a branch to an org';

  public static examples = [
  `$ sfdx raven:utils:deploy:branch2org -r git@github.com:user/some-repo.git -b branchName -u orgName`
  ];
  
  protected static requiresUsername = true;
  protected static supportsDevhubUsername = true;
  protected static requiresProject = false;

  protected static flagsConfig = {
    repository: flags.string({
        char: 'r', 
        description: 'A URL to the repo. It can either be an HTTPs URL (eg. \'https://github.com/user/some-repo.git\') and' +
                     'you will be prompted to enter a username and password, or an SSH URL (eg. \'git@github.com:user/some-repo.git\')' +
                     'which assumes you have SSH keys configured for this repo.',
        required: true
    }),
    branch: flags.string({
        char: 'b', 
        description: 'The branch', 
        required: true
    })
  };


  public async run(): Promise<AnyJson> {
    
    let username = '';
    let password = '';
    let repository = '';

    if(this.flags.repository.startsWith('https://')) {

        let repositoryBaseUrl = this.flags.repository.replace('https://', '');

        this.ux.log(`To access '${repositoryBaseUrl}' via HTTPs, you need to provide credentials`)
        username = await cli.prompt('Enter username')

        if(username.includes('@')) {
            this.ux.log('Oops, username shoudln\'t be an email address, try again')
            username = await cli.prompt('Enter username')   
        }

        let passwordRaw = await cli.prompt('Enter password', {type: 'hide'}) 
        password = encodeURI(passwordRaw);

        repository = `https://${username}:${password}@${repositoryBaseUrl}`;

    } else {

        repository = this.flags.repository;

    }

    
    // Clone & checkout repo
    cli.action.start(`Cloning \'${this.flags.repository}\' & checking out \'${this.flags.branch}\'`);

    const git = simpleGit();

    try {
        await git.clone(repository, '.', ['-b', this.flags.branch]);
        cli.action.stop();

    } catch (e) { 
        cli.action.stop('Error');
        this.ux.log(e);
        return;

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
        return;
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
        return;
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
