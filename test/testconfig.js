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

module.exports = {
    loadIntegration: function() {
        if (process.env.ADOBE_IO_INTEGRATION_JSON === undefined) {
            console.log(`        SKIPPING tests because of missing config.

        To run this end to end test you have to

        1. configure an integration in https://console.adobe.io in a test organization of choice with these services enabled:
        - I/O Events
        - I/O Management API

        2. create a json file as below with the technical account info from the integration, the path to the private key
        you created for this integration, and the org & integration IDs taken from the console.adobe.io URL:
        https://console.adobe.io/integrations/{consoleOrgId}/{consoleIntegrationId}/overview

        {
            "clientId":             "1401f9dxxxxxxxxxxxxxxxxxxxxxxxxx",
            "technicalAccountId":   "053530dxxxxxxxxxxxxxxxxx@techacct.adobe.com",
            "orgId":                "6EEF747xxxxxxxxxxxxxxxxx@AdobeOrg",
            "clientSecret":         "d34081fc-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
            "privateKeyFile":       "/path/to/private-pem-file.key",
            "consoleOrgId":         "123456",
            "consoleIntegrationId": "99999"
        }

        3. set an environment variable that this test can see to the path of the json file created in step 2:

        ADOBE_IO_INTEGRATION_JSON=/path/to/integration-123456-99999.json
            `);

            return undefined;
        }

        console.log("loading integration:", process.env.ADOBE_IO_INTEGRATION_JSON);

        return require(process.env.ADOBE_IO_INTEGRATION_JSON);
    }
}
