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

/* eslint-disable prefer-template */

'use strict';

const AdobeIOEvents = require('../src/events');
const AdobeIOEventEmitter = require('../src/eventemitter');
const AdobeAuth = require('../src/auth');
const assert = require('assert');
const os = require("os");
const testconfig = require('./testconfig');

const rewire = require('rewire');
const parseLinkHeader = rewire('../src/events').__get__('parseLinkHeader')

// ---------------------------------------------------
// helpers

function getIsoDate(date) {
    return date.getFullYear() + '-' +
            ('0'+ (date.getMonth()+1)).slice(-2) + '-' +
            ('0'+ date.getDate()).slice(-2);
}

// ---------------------------------------------------

const DATE = new Date();

const TEST_PROVIDER_ID    = `__adobe-io-events-client__test__${os.hostname()}__${DATE.getTime()}`;
const TEST_PROVIDER_LABEL = `${getIsoDate(DATE)} Test adobe-io-events-client - ${os.hostname()} (${DATE.getTime()})`;

const TEST_EVENT_CODE = "test_event";
const TEST_EVENT_LABEL = "Test Event";

const DESCRIPTION = "Automatically created by test code from @nui/adobe-io-events-client. Can be deleted if it was left over.";

// ---------------------------------------------------
// test cases

describe('AdobeIOEvents', function() {
    let ioEvents;
    let integration;
    let accessToken;
    const journalRegistrationIds = [];

    before("init test config", function() {
        integration = testconfig.loadIntegration();
        if (integration !== undefined) {
            return new AdobeAuth()
                .createAccessToken(integration.technicalAccount, AdobeIOEvents.JWT_META_SCOPES)
                .then(token => {
                    accessToken = token;

                    ioEvents = new AdobeIOEvents({
                        accessToken: accessToken,
                        orgId: integration.technicalAccount.org,
                        defaults: {
                            consumerId: integration.consumerId,
                            applicationId: integration.applicationId
                        }
                    });

                    console.log("        event provider id: ", TEST_PROVIDER_ID);
                    console.log("        event provider   : ", TEST_PROVIDER_LABEL);
                });
        } else {
            this.test.parent.pending = true;
            this.skip();
            return Promise.resolve();
        }
    });

    describe('new AdobeIOEvents()', function() {
        it('should fail on incomplete arguments', function() {
            try {
                new AdobeIOEvents();
                assert(false);
            } catch(ignore) {}
        });

        it('should fail on incorrect access token', () => {
            try {
                new AdobeIOEvents({
                    orgId: integration.technicalAccount.org,
                    accessToken: "my token"
                });
                assert(false);
            } catch(ignore) {}
        });
    });

    describe('#registerEventProvider()', () => {
        it('should register an event provider', () => {

            return ioEvents.registerEventProvider({
                id: TEST_PROVIDER_ID,
                label: TEST_PROVIDER_LABEL,
                grouping: AdobeIOEvents.Groups.MARKETING_CLOUD,
                metadata: AdobeIOEvents.Metadata.ASSET_COMPUTE,
                instanceId: TEST_PROVIDER_ID
            })
            .then(() => {
                assert(true);
            });
        });

        it('should register an event provider with provider set in defaults', () => {

            const ioEvents2 = new AdobeIOEvents({
                accessToken: accessToken,
                orgId: integration.technicalAccount.org,
                defaults: {
                    providerId: TEST_PROVIDER_ID,
                    providerMetadata: AdobeIOEvents.Metadata.ASSET_COMPUTE
                }
            });

            return ioEvents2.registerEventProvider({
                label: TEST_PROVIDER_LABEL,
                grouping: AdobeIOEvents.Groups.MARKETING_CLOUD,
                instanceId: TEST_PROVIDER_ID
            })
            .then(() => {
                assert(true);
            });
        });
    });

    describe('#registerEventType()', () => {
        it('should register an event type', () => {

            return ioEvents.registerEventType({
                provider: TEST_PROVIDER_ID,
                code: TEST_EVENT_CODE,
                label: TEST_EVENT_LABEL,
                description: "This event indicates that something happened"
            })
            .then(() => {
                assert(true);
            });
        });

        it('should register an event type with provider set in defaults', () => {

            const ioEvents2 = new AdobeIOEvents({
                accessToken: accessToken,
                orgId: integration.technicalAccount.org,
                defaults: {
                    providerId: TEST_PROVIDER_ID,
                    providerMetadata: AdobeIOEvents.Metadata.ASSET_COMPUTE
                }
            });

            return ioEvents2.registerEventType({
                code: TEST_EVENT_CODE,
                label: TEST_EVENT_LABEL,
                description: "This event indicates that something happened"
            })
            .then(() => {
                assert(true);
            });
        });
    });

    describe('#createJournal()', () => {

        it('should create a journal', () => {
            return ioEvents.createJournal({
                name: `${getIsoDate(DATE)} - JS test journal - create`,
                description: DESCRIPTION,
                providerId: TEST_PROVIDER_ID,
                eventTypes: [TEST_EVENT_CODE]
            })
            .then(response => {
                console.log("        created journal with registration id", response.registration_id);
                journalRegistrationIds.push(response.registration_id);
                assert(true);
            });
        });
    });

    describe('#sendEvent()', () => {
        // max time to wait
        const DELIVERY_TIMEOUT = 60000;

        let journalUrl;

        const timestamp = new Date().getTime();

        // register journal to see event gets received
        before(function() {
            this.timeout(2 * DELIVERY_TIMEOUT);
            console.log("        event timestamp", timestamp);

            return ioEvents.registerEventProvider({
                id: TEST_PROVIDER_ID,
                label: TEST_PROVIDER_LABEL,
                grouping: AdobeIOEvents.Groups.MARKETING_CLOUD,
                metadata: AdobeIOEvents.Metadata.ASSET_COMPUTE,
                instanceId: TEST_PROVIDER_ID
            })
            .then(() => {
                return ioEvents.registerEventType({
                    provider: TEST_PROVIDER_ID,
                    code: TEST_EVENT_CODE,
                    label: TEST_EVENT_LABEL,
                    description: "This event indicates that something happened"
                })
            })
            .then(() => {
                return ioEvents.createJournal({
                    name: `${getIsoDate(DATE)} - JS test journal - send events`,
                    description: DESCRIPTION,
                    providerId: TEST_PROVIDER_ID,
                    eventTypes: [TEST_EVENT_CODE]
                }).then(response => {
                    console.log("        created journal with registration id", response.registration_id);
                    journalRegistrationIds.push(response.registration_id);
                    return response;
                })
            })
            .then(response => {
                journalUrl = response.events_url;
                console.log("        journalUrl", journalUrl);
                console.log("        waiting a bit for new journal in I/O events to become ready...");
            })
            // wait some time after creation otherwise sendEvent will fail with 204
            .then(() => new Promise(resolve => setTimeout(resolve, 30 * 1000)))
            .catch(err => {
                console.log("        SKIPPING send event tests because could not setup event registration and journal:", err);
                this.skip();
            });
        });

        it('should send an event and receive it via a journal', function() {
            // ensure mocha test has enough timeout
            this.timeout(2 * DELIVERY_TIMEOUT);

            console.time('        send event to journal delivery');
            return ioEvents.sendEvent({
                provider: TEST_PROVIDER_ID,
                code: TEST_EVENT_CODE,
                payload: {
                    timestamp: timestamp
                }
            })
            .then(() => {
                console.log("        sent event.");

                return AdobeIOEventEmitter.findEventInJournal(
                    ioEvents, 
                    journalUrl, 
                    DELIVERY_TIMEOUT, 
                    event => event.event.timestamp === timestamp
                )
                .then(() => {
                    console.timeEnd('        send event to journal delivery');
                })
                .catch(() => assert(false, "event not received within timeout"));
            });
        });

        it('should send an event with provider set in defaults', () => {

            const ioEvents2 = new AdobeIOEvents({
                accessToken: accessToken,
                orgId: integration.technicalAccount.org,
                defaults: {
                    providerId: TEST_PROVIDER_ID,
                    providerMetadata: AdobeIOEvents.Metadata.ASSET_COMPUTE
                }
            });

            return ioEvents2.sendEvent({
                code: TEST_EVENT_CODE,
                payload: {
                    hello: "world"
                }
            })
            .then(() => {
                assert(true);
            });
        });
    });

    describe('#parseLinkHeader', () => {
        it('empty', () => {
            const result = parseLinkHeader('', '');
            assert.deepStrictEqual(result, {});
        });
        it('one absolute link', () => {
            const result = parseLinkHeader('https://host.com', 
                '<https://anotherhost.com/path/to/resource>; rel="next"'
            );
            assert.deepStrictEqual(result, {
                next: 'https://anotherhost.com/path/to/resource'
            });
        });
        it('one relative link', () => {
            const result = parseLinkHeader('https://host.com', 
                '</path/to/resource>; rel="next"'
            );
            assert.deepStrictEqual(result, {
                next: 'https://host.com/path/to/resource'
            });
        });
        it('two absolute links', () => {
            const result = parseLinkHeader('https://host.com', 
                '<https://host1.com/path/to/resource1>; rel="prev", <https://host2.com/path/to/resource2>; rel="next"'
            );
            assert.deepStrictEqual(result, {
                prev: 'https://host1.com/path/to/resource1',
                next: 'https://host2.com/path/to/resource2'
            });
        });
        it('two relative links', () => {
            const result = parseLinkHeader('https://host.com', 
                '</path/to/resource1>; rel="prev", </path/to/resource2>; rel="next"'
            );
            assert.deepStrictEqual(result, {
                prev: 'https://host.com/path/to/resource1',
                next: 'https://host.com/path/to/resource2'
            });
        });
    })

    after(function() {
        // TODO: remove the event provider and all it's event types
        // requires use of DELETE /csm/events/provider/{id} which is not working right now

        console.log("cleaning up...");

        return Promise.all(
            journalRegistrationIds.map(id => {
                console.log("deleting journal registration:", id);
                return ioEvents.deleteJournal(id)
                    .catch(e => { console.error(e)});
            })
        ).then(() => {
            console.log("deleting event provider:", TEST_PROVIDER_ID);
            return ioEvents.deleteEventProvider(TEST_PROVIDER_ID)
        }).then(() => {
            console.log("cleanup done.");
        });
    });
});