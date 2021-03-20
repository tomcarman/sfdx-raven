import { flags, SfdxCommand } from '@salesforce/command';
import { AnyJson } from '@salesforce/ts-types';
import * as fs from 'fs';
import cli from 'cli-ux';
import util = require('util');
import child_process = require('child_process');
import path = require('path');
const emoji = require('node-emoji');
const extract = require('extract-zip')
const exec = util.promisify(child_process.exec);


export default class Diff extends SfdxCommand {

  public static description = '\nAllows you to quickly compare metadata of files between two orgs. Intended to be used for quick compares of '+
                              'single (or possibly a few) files of the same metadata type, rather than a full org compare (there are better ' +
                              'tools for that) The results are stored in a diff_{timestamp}.html file wherever you run the command from, and '+
                              'automatically opened in a browser.';

  public static examples = [
  `$ sfdx raven:utils:diff --source dev_org --target qa_org --type CustomObject --items Account`,
  `$ sfdx raven:utils:diff --source dev_org --target qa_org --type CustomObject --items 'Account,Opportunity'`,
  `$ sfdx raven:utils:diff --source dev_org --target qa_org --type ApexClass --items MyClass`,
  `$ sfdx raven:utils:diff --source dev_org --target qa_org --type ApexClass --items 'MyClass,MyTestClass,MyController`,
  `$ sfdx  raven:utils:diff -s dev_org -t qa_org -o CustomObject -i 'Account'`,
  `$ sfdx  raven:utils:diff -s dev_org -t qa_org -o ApexClass -i 'MyClass'`,
  `$ sfdx  raven:utils:diff -s dev_org -t qa_org -o ApexClass -i 'MyClass' --silent`
  ];
  
  protected static requiresUsername = false;
  protected static supportsDevhubUsername = false;
  protected static requiresProject = false;

  protected static flagsConfig = {
                                    source: flags.string({char: 's', description: 'Alias / Username of the org you want to use as the SOURCE of the diff eg. projectDev', required: true}),
                                    target: flags.string({char: 't', description: 'Alias / Username of the org you want to use as the TARGET of the diff eg. projectQA', required: true}),
                                    type: flags.string({char: 'o', description: 'The type of metadata you want to compare eg. ApexClass or CustomObject', required: true}),
                                    items: flags.string({char: 'i', description: 'The items you wish to compare eg. MyCoolClass or Account. Can be multiple items comma delimted eg. MyClass,MyController or Account,Opportunity (but can only be of one \'type\')',required: true}),
                                    filename: flags.string({description: 'Optional: The filename of the diff.html. Defaults to diff_{timestamp}.html', required: false}),
                                    format: flags.string({char: 'f',description: 'Optional: Format of the diff. Options are \'line\' (inline diff) or \'side\' (side-by-side diff). Defaults to \'line\'', required: false}),
                                    silent: flags.boolean({description: 'use this to not auto open browser with results', required: false})
                                    };


  public async run(): Promise<AnyJson> {

    cli.action.start(`${emoji.get('card_index_dividers')}  Building package.xml`);

    // Set up folders, make if they don't exist
    let tempDir = path.resolve('./sfdx-raven-util-diff-temp');
    let packageDir = path.resolve(tempDir, 'package');
    let sourceDir = path.resolve(tempDir, 'source');
    let targetDir = path.resolve(tempDir, 'target');
    fs.mkdirSync(tempDir);
    fs.mkdirSync(packageDir);
    fs.mkdirSync(sourceDir);
    fs.mkdirSync(targetDir);

    // Build package.xml
    let packageManifest = `${packageDir}/package.xml`;
    this.buildPackagepackageFile(packageManifest, this.flags.type, this.flags.items);
    cli.action.stop();

    // Get metadata from source and target orgs
    await this.retrieveMetadata(packageManifest, this.flags.source, sourceDir);
    await this.retrieveMetadata(packageManifest, this.flags.target, targetDir);

    // Unzip metadata to temporary directory 
    cli.action.start(`${emoji.get('open_file_folder')} Unzipping metadata`)
    try {
        await extract(path.join(sourceDir, '/unpackaged.zip'), { dir: sourceDir })
        await extract(path.join(targetDir, '/unpackaged.zip'), { dir: targetDir })
      } catch (err) {
          this.ux.log(err);
      } 
    cli.action.stop();

    // Generate diff and open with diff2html
    cli.action.start(`${emoji.get('male-cook')} Preparing diff`);
    
    this.createTemplate(tempDir);

    let sourceMetadata = path.join(sourceDir, '/unpackaged');
    let targetMetadata = path.join(targetDir, '/unpackaged');
    let template = path.join(tempDir, 'template.html');
    let diffFile = (this.flags.name != null) ? path.resolve(`${this.flags.name}.html`) : path.resolve(`diff_${Date.now().toString()}.html`);
    let format = (this.flags.format != null) ? this.flags.format : 'line';

    // Uses diff and pipes the results (stdin) into diff2html cli, which in turn generates an html file with the diff
    let diff = `diff --recursive --unified ${sourceMetadata} ${targetMetadata} | diff2html --hwt ${template} --input stdin --file ${diffFile} --style ${format}`;
    
    try {
        await exec(diff);
    } catch (err) {
        cli.action.stop();
        this.ux.log(err);
        return;
    }
    cli.action.stop();

    // Clean up the temporary files
    cli.action.start(`${emoji.get('sparkles')} Cleaning up`)
    try {
        // @ts-ignore
        fs.rmdirSync(tempDir, { recursive: true });
    } catch (err) {
        this.ux.log(err);
    }
    cli.action.stop();

    // Open diff in browser
    if(!this.flags.silent) {
      cli.action.start(`${emoji.get('globe_with_meridians')} Opening with diff2html in browser`)
      try {
        await cli.open(diffFile);
      } catch (err) {
        cli.action.stop();
        this.ux.log(err);
        return;
      }
      cli.action.stop();
    }

  }


  /**
   * Builds a package.xml based on the supplied object and (comma delimited) item(s)
   * @param filename absolute path of where to store the package.xml 
   * @param type the salesforce metadata type to retrieve eg. ApexClass, CustomObject
   * @param items a comma delimited list of items to compare eg. MyCoolClass,ClassHandler or Account,Opportunity
   */
  private buildPackagepackageFile(filename: string, type: string, items: string) {

    let packageFile = fs.createWriteStream(filename);

    packageFile.write('<?xml version="1.0" encoding="UTF-8"?>');
    packageFile.write('\n<Package xmlns="http://soap.sforce.com/2006/04/metadata">');
    packageFile.write('\n<types>');

    for(let item of items.split(',')) {
        packageFile.write(`\n<members>${item}</members>`);
    }

    packageFile.write(`\n<name>${type}</name>`);
    packageFile.write('\n</types>');
    packageFile.write('\n<version>45.0</version>');
    packageFile.write('\n</Package>');
    packageFile.close();

  }


  /**
   * Restrieves metadata contained in the provided package.xml from the provided org and stores in the provided directory.
   * @param packageManifest path of the package.xml 
   * @param org alias/username of an org
   * @param targetDir directory to store the retrieved metadata
   * @returns 
   */
  private async retrieveMetadata(packageManifest: string, org: string, targetDir: string) {
    cli.action.start(`${emoji.get('arrow_double_down')} Retrieving from ${org}`);
    
    const retrieveCommand = `sfdx force:mdapi:retrieve -k ${packageManifest} -u ${org} -r ${targetDir}`;

    try {
        await exec(retrieveCommand)
    } catch (err) {
        this.ux.log(err);
        return;
    }

    cli.action.stop();

  }


  /**
   * Generates a template.html for diff2html
   * @param dir absolute path of where to store the template.
   */
  private createTemplate(dir :string) {

    let packageFile = fs.createWriteStream(path.join(dir, 'template.html'));

    packageFile.write(`<html>
      <head>
        <meta charset="utf-8" />
        <title>sfdx:raven:diff</title>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/9.9.0/styles/github.min.css" />
        <!--diff2html-css-->
        <!--diff2html-js-ui-->
        <script>
          document.addEventListener('DOMContentLoaded', () => {
            const targetElement = document.getElementById('diff');
            const diff2htmlUi = new Diff2HtmlUI(targetElement);
            diff2html-fileListToggle
            diff2html-synchronisedScroll
            diff2html-highlightCode
          });
        </script>
      </head>
      <body>
        <div id="diff">
        <!--diff2html-diff-->
      </div>
      <h4 style="font-family:courier;text-align:center">This diff was generated by <a href="https://github.com/tomcarman/sfdx-raven">sfdx-raven</a> & <a href="https://github.com/rtfpessoa/diff2html">diff2html</h4>
      </body>
    </html>`);

    packageFile.close();

  }

}
