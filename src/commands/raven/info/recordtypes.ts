import { flags, SfdxCommand } from '@salesforce/command';
import { AnyJson } from '@salesforce/ts-types';
import { CliUx } from '@oclif/core';

export default class Recordtypes extends SfdxCommand {

  public static description = 'Gets a list of RecordTypes for a given object';

  public static examples = [
  `$ sfdx raven:info:fields -o Account`
  ];

  protected static requiresUsername = true;
  protected static supportsDevhubUsername = true;
  protected static requiresProject = false;

  protected static flagsConfig = {
    object: flags.string({
        char: 'o', 
        description: 'The object to get RecordTypes for',
        required: true
    })
  };

  public async run(): Promise<AnyJson> {

    CliUx.ux.action.start('Fetching');

    // Setup
    interface QueryResult {
        totalSize: number;
        done: boolean;
        records: Record[];
    }

    interface Record {
        attributes: object;
        Id: string;
    }

    // Connect to org and SOQL for recordtype metadata
    const conn = this.org.getConnection();
    const query = `SELECT Name, DeveloperName, Id FROM RecordType WHERE SObjectType = '${this.flags.object}'`;
    const result = <QueryResult>await conn.query(query);

    CliUx.ux.action.stop();

    // Return table of fields
    this.ux.table(result.records, ['Name', 'DeveloperName', 'Id']);

    // Return url
    this.ux.log(`\n${conn.instanceUrl}/lightning/setup/ObjectManager/${this.flags.object}/RecordTypes/view`);

    // Return an object to be displayed with --json
    const outputString = JSON.stringify(result);
    return { outputString };

  }
}
