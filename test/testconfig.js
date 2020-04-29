/*
Copyright 2020 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

'use strict';

const yaml = require('js-yaml');
const fs = require('fs');
const { base64decode } = require('nodejs-base64');

module.exports = {
    loadIntegration: function() {
        if (process.env.ADOBE_IO_INTEGRATION_YAML) {
            console.log("        loading integration yaml", process.env.ADOBE_IO_INTEGRATION_YAML);
            const yml = fs.readFileSync(process.env.ADOBE_IO_INTEGRATION_YAML, 'utf8');
            return yaml.safeLoad(yml);

        } else if (process.env.ASSET_COMPUTE_IT_INTEGRATION_YAML) {
            console.log("        loading integration yaml from `ASSET_COMPUTE_IT_INTEGRATION_YAML`");
            const yml = base64decode(process.env.ASSET_COMPUTE_IT_INTEGRATION_YAML);
            return yaml.safeLoad(yml);
        } else {
            console.log(`        SKIPPING tests because of missing config.

        To run this end to end test you have to

        1. Configure an integration in https://console.adobe.io inside a
           test organization of your choice with these services enabled:

           - I/O Events
           - I/O Management API

        2. Create a YAML file as below.

           Include the technical account info from the integration, the
           private key you created for this integration, and the
           consumerId & applicationId taken from the console.adobe.io URL:
               https://console.adobe.io/integrations/{consumerId}/{applicationId}/overview

           -------------------------------------------------------------------------------
            consumerId:    123456
            applicationId: 99999

            technicalAccount:
                id:           053530dxxxxxxxxxxxxxxxxx@techacct.adobe.com
                org:          6EEF747xxxxxxxxxxxxxxxxx@AdobeOrg
                clientId:     1401f9dxxxxxxxxxxxxxxxxxxxxxxxxx
                clientSecret: d34081fc-xxxx-xxxx-xxxx-xxxxxxxxxxxx
                privateKey: |
                    -----BEGIN PRIVATE KEY-----
                    abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijkl
                    mnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwx
                    ....
                    -----END PRIVATE KEY-----
           -------------------------------------------------------------------------------

        3. Set the following environment variable (visible to this test) to the
           path of the YAML file created in step 2:

           ADOBE_IO_INTEGRATION_YAML=/path/to/integration-123456-99999.yaml
            `);

            return undefined;
        }
    }
}
