import { flags, SfdxCommand } from '@salesforce/command';
import { StreamingClient } from '@salesforce/core';
import { Duration } from '@salesforce/kit/lib';
import { AnyJson, JsonMap } from '@salesforce/ts-types';
import { CliUx } from '@oclif/core';
const emoji = require('node-emoji');

export default class Listen extends SfdxCommand {

    public static description = 'Subscribe to Platform Events';

    public static examples = [
        '$ sfdx raven:utils:event:listen -u myorg -e /event/My_Event__e',
        '$ sfdx raven:utils:event:listen -u myorg -e /event/My_Event__e --replayid 21980378',
        '$ sfdx raven:utils:event:listen -u myorg -e /event/My_Event__e --timeout 10',
        '$ sfdx raven:utils:event:listen -u myorg -e /event/My_Event__e -r 21980378 -t 10',
    ];

    protected static requiresUsername = true;
    protected static supportsDevhubUsername = true;
    protected static requiresProject = false;

    protected static flagsConfig = {
        event: flags.string({
            char: 'e', 
            description: 'The name of the Platform Event that you want to subscribe with \'/event/\' prefix  eg. /event/My_Event__e',
            required: true
        }),
        replayid: flags.integer({
            char: 'r',
            description: 'Optional: The replay id to replay events from eg. 21980378',
            required: false 
        }),
        timeout: flags.number({
            char: 't',
            description: 'Optional: How long to subscribe for before timing out in minutes eg. 10. Default is 3 minutes'
        })
    };

    public async run(): Promise<AnyJson> {

        // Set up stream client and stream processor

        CliUx.ux.action.start(`${emoji.get('electric_plug')} Connecting to org`);

        const streamProcessor = (message: JsonMap) => {
            this.ux.log('\n'+JSON.stringify(message,null,2));
            return {
                completed: false,
            };
        };

        const options = new StreamingClient.DefaultOptions(this.org, this.flags.event, streamProcessor);

        if(this.flags.timeout != null) {
            options.setSubscribeTimeout(Duration.minutes(this.flags.timeout));
        }

        // Connect to the org

        const asyncStatusClient = await StreamingClient.create(options);
        await asyncStatusClient.handshake();
    
        CliUx.ux.action.stop();

        // Set the relay id if one has been supplied

        if(this.flags.replayid != null) {
            this.ux.log(`${emoji.get('leftwards_arrow_with_hook')}  Replaying from ${this.flags.replayid}`);
            asyncStatusClient.replay(this.flags.replayid);

        }

        // Start listening for events

        this.ux.log(`${emoji.get('satellite_antenna')} Listening for events...\n`);

        await asyncStatusClient.subscribe(async () => {});

        return {};
        
    }
}