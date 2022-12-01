import { CliUx } from '@oclif/core';
import { AnyJson } from '@salesforce/ts-types';
import { flags, SfdxCommand } from '@salesforce/command';


export default class Fields extends SfdxCommand {

  public static description = 'Gets a list of field names, labels and type for a given object';

  public static examples = [
  `$ sfdx raven:info:fields -o Account`
  ];
  
  protected static requiresUsername = true;
  protected static supportsDevhubUsername = true;
  protected static requiresProject = false;

  protected static flagsConfig = {
    object: flags.string({
        char: 'o', 
        description: 'The object to get fields for',
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

    // Connect to org and SOQL for field metadata
    const conn = this.org.getConnection();
    const query = `SELECT Label, QualifiedApiName, DataType FROM FieldDefinition WHERE EntityDefinition.QualifiedApiName = '${this.flags.object}' ORDER BY QualifiedApiName`;
    const result = <QueryResult>await conn.query(query);

    CliUx.ux.action.stop();

    // Return as table
    this.ux.table(result.records, ['Label', 'QualifiedApiName', 'DataType']);

    // Return url
    this.ux.log(`\n${conn.instanceUrl}/lightning/setup/ObjectManager/${this.flags.object}/FieldsAndRelationships/view`);

    // Return an object to be displayed with --json
    const outputString = JSON.stringify(result);
    return { outputString };

  }
}
