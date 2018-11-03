/**
 *  ADOBE CONFIDENTIAL
 *  __________________
 *
 *  Copyright 2018 Adobe Systems Incorporated
 *  All Rights Reserved.
 *
 *  NOTICE:  All information contained herein is, and remains
 *  the property of Adobe Systems Incorporated and its suppliers,
 *  if any.  The intellectual and technical concepts contained
 *  herein are proprietary to Adobe Systems Incorporated and its
 *  suppliers and are protected by trade secret or copyright law.
 *  Dissemination of this information or reproduction of this material
 *  is strictly forbidden unless prior written permission is obtained
 *  from Adobe Systems Incorporated.
 */

'use strict';

const yaml = require('js-yaml');
const fs = require('fs');

module.exports = {
    loadIntegration: function() {
        if (process.env.ADOBE_IO_INTEGRATION_YAML) {
            console.log("        loading integration yaml", process.env.ADOBE_IO_INTEGRATION_YAML);
            const yml = fs.readFileSync(process.env.ADOBE_IO_INTEGRATION_YAML, 'utf8');
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
