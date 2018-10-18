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

const AdobeIOEventsClient = require('../index');
const assert = require('assert');
const jsonwebtoken = require('jsonwebtoken');
const os = require("os");

// ---------------------------------------------------

function getIsoDate(date) {
    return date.getFullYear() + '-' +
            ('0'+ (date.getMonth()+1)).slice(-2) + '-' +
            ('0'+ date.getDate()).slice(-2);
}

const DATE = new Date();

// TODO: enable unique providers using timestamp again ONCE we have a stable cleanup
const TEST_PROVIDER_ID = `__JS_CLIENT_TEST_alexkli-macbook-pro.macromedia.com_2018-10-16`;
const TEST_PROVIDER_LABEL = `JS Client Test alexkli-macbook-pro.macromedia.com 2018-10-16`;
// const TEST_PROVIDER_ID    = `__${process.env.npm_package_name}__test__${os.hostname()}__${DATE.getTime()}`;
// const TEST_PROVIDER_LABEL = `Test ${process.env.npm_package_name} ${os.hostname()} ${getIsoDate(DATE)} (${DATE.getTime()})`;

const EVENT_CODE = "something_happened";

// ---------------------------------------------------
// test cases

describe('AdobeIOEventsClient', function() {
    let ioevents;

    before("init test config", function() {
        if (process.env.ORG_ID === undefined || process.env.ACCESS_TOKEN === undefined) {
            assert(false, `ERROR: to run this end to end test you have to set these environment variables:

            ORG_ID        - organization ID for a suitable test organization, example: 6EEF12345678901234567890@AdobeOrg
            ACCESS_TOKEN  - access token from an integration in console.adobe.io with I/O Events service entitlement.
                            use the JWT tab on the integration in console.adobe.io to create the JWT, then use the
                            curl command to get the access token

        When using VS Code, you can set environments variables in your tasks.json for the test task like this:

            "tasks": [
                {
                    "type": "npm",
                    "script": "test",
                    "group": {
                        "kind": "test",
                        "isDefault": true
                    },
                    "options": {
                        "env": {
                            "ORG_ID": "6EEF12345678901234567890@AdobeOrg",
                            "ACCESS_TOKEN": "eyJ4NX..............."
                        }
                    }
                }
            ]
`);
            assert(process.env.ORG_ID !== undefined, "environment variable ORG_ID is not set");
            assert(process.env.ACCESS_TOKEN !== undefined, "environment variable ACCESS_TOKEN is not set");
        }

        // check token is valid for another 5 min at least
        const jwt = jsonwebtoken.decode(process.env.ACCESS_TOKEN);
        const expires = new Date(Number(jwt.created_at) + Number(jwt.expires_in));
        assert(expires.getTime() > (new Date().getTime() + 5*60*1000), "access token expired or too close to expiry time");

        ioevents = new AdobeIOEventsClient({
            accessToken: process.env.ACCESS_TOKEN,
            orgId: process.env.ORG_ID
        });

        console.log("        event provider id : ", TEST_PROVIDER_ID);
        console.log("        event provider    : ", TEST_PROVIDER_LABEL);
        console.log("        event type        : ", EVENT_CODE)
    });

    describe('new AdobeIOEventsClient()', () => {
        it('should fail on incomplete arguments', () => {
            try {
                new AdobeIOEventsClient();
                assert(false);
            } catch(ignore) {}
        });

        it('should fail on incorrect access token', () => {
            try {
                new AdobeIOEventsClient({
                    orgId: process.env.ORG_ID,
                    accessToken: "my token"
                });
                assert(false);
            } catch(ignore) {}
        });
    });

    describe('#registerEventProvider()', () => {
        it('should register an event provider', () => {

            return ioevents.registerEventProvider({
                id: TEST_PROVIDER_ID,
                label: TEST_PROVIDER_LABEL,
                grouping: AdobeIOEventsClient.Groups.MARKETING_CLOUD
            })
            .then(() => {
                assert(true);
            });
        });
    });

    describe('#registerEventType()', () => {
        it('should register an event type', () => {

            return ioevents.registerEventType({
                provider: TEST_PROVIDER_ID,
                code: EVENT_CODE,
                label: "Something Happened",
                description: "This event indicates that something happened"
            })
            .then(() => {
                assert(true);
            });
        });
    });

    describe('#sendEvent()', () => {
        it('should send an event', () => {

            // TODO: register journal to see event gets received

            return ioevents.sendEvent({
                provider: TEST_PROVIDER_ID,
                code: EVENT_CODE,
                payload: {
                    hello: "world",
                    date: new Date()
                }
            })
            .then(() => {
                assert(true);
            });
        });
    });

    after(function() {
        // TODO: remove the event provider and all it's event types
        // requires use of DELETE /csm/events/provider/{id} which is not working right now

        console.log("cleaning up...");
    });
});