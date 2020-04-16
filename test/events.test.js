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

/* eslint-env mocha */

'use strict';

const AdobeIOEvents = require('../lib/events');
const AdobeIOEventEmitter = require('../lib/eventemitter');
const AdobeAuth = require('../lib/auth');
const assert = require('assert');
const os = require("os");
const testconfig = require('./testconfig');
const mockery = require('mockery');
const nock = require('nock');
const jsonwebtoken = require('jsonwebtoken');

const rewire = require('rewire');
const parseLinkHeader = rewire('../lib/events').__get__('parseLinkHeader');

// ---------------------------------------------------

const DATE = new Date();

const TEST_PROVIDER_ID    = `__adobe-io-events-client__test__${os.hostname()}__${DATE.getTime()}`;
const TEST_PROVIDER_LABEL = `${getIsoDate(DATE)} Test adobe-io-events-client - ${os.hostname()} (${DATE.getTime()})`;

const TEST_EVENT_CODE = "test_event";
const TEST_EVENT_LABEL = "Test Event";

const DESCRIPTION = "Automatically created by test code from @nui/adobe-io-events-client. Can be deleted if it was left over.";

const FAKE_ACCESS_TOKEN = 'cdsj234fcdlr4';
const FAKE_ORG_ID = 'fakeorgId';
const FAKE_CLIENT_ID = 'fakeClientId';

// ---------------------------------------------------
// helpers

function getIsoDate(date) {
    return date.getFullYear() + '-' +
            ('0'+ (date.getMonth()+1)).slice(-2) + '-' +
            ('0'+ date.getDate()).slice(-2);
}

function createNocks(base_url, path, method) {
    if (method === "GET") {
        nock(base_url)
            .matchHeader('Authorization',`Bearer ${FAKE_ACCESS_TOKEN}`)
            .matchHeader('x-ims-org-id',FAKE_ORG_ID)
            .get(path)
            .thrice()
            .reply(504)
        nock(base_url)
            .matchHeader('Authorization',`Bearer ${FAKE_ACCESS_TOKEN}`)
            .matchHeader('x-ims-org-id',FAKE_ORG_ID)
            .get(path)
            .reply(200, {status:200, statusText:'Success!'})
    }
    if (method === "POST") {
        nock(base_url)
            .matchHeader('Authorization',`Bearer ${FAKE_ACCESS_TOKEN}`)
            .matchHeader('x-ims-org-id',FAKE_ORG_ID)
            .post(path)
            .thrice()
            .reply(504)
        nock(base_url)
            .matchHeader('Authorization',`Bearer ${FAKE_ACCESS_TOKEN}`)
            .matchHeader('x-ims-org-id',FAKE_ORG_ID)
            .post(path)
            .reply(200, {status:200, statusText:'Success!'})
    }
}

// ---------------------------------------------------
// test cases

describe('events.js - AdobeIOEvents', function() {
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
        it('should register an event provider', async () => {

            const result = await ioEvents.registerEventProvider({
                id: TEST_PROVIDER_ID,
                label: TEST_PROVIDER_LABEL,
                grouping: AdobeIOEvents.Groups.MARKETING_CLOUD,
                metadata: AdobeIOEvents.Metadata.ASSET_COMPUTE,
                instanceId: TEST_PROVIDER_ID
            });

            // no exception means test OK
            assert.ok(result !== undefined);
            assert.ok(result !== null);
        });

        it('should register an event provider with provider set in defaults', async () => {
            const ioEvents2 = new AdobeIOEvents({
                accessToken: accessToken,
                orgId: integration.technicalAccount.org,
                defaults: {
                    providerId: TEST_PROVIDER_ID,
                    providerMetadata: AdobeIOEvents.Metadata.ASSET_COMPUTE
                }
            });

            const result = await ioEvents2.registerEventProvider({
                label: TEST_PROVIDER_LABEL,
                grouping: AdobeIOEvents.Groups.MARKETING_CLOUD,
                instanceId: TEST_PROVIDER_ID
            });

            // no exception means test OK
            assert.ok(result !== undefined);
            assert.ok(result !== null);
        });
    });

    describe('#registerEventType()', () => {
        it('should register an event type', async () => {
            const result = await ioEvents.registerEventType({
                provider: TEST_PROVIDER_ID,
                code: TEST_EVENT_CODE,
                label: TEST_EVENT_LABEL,
                description: "This event indicates that something happened"
            });

            // no exception means test OK
            assert.ok(result !== undefined);
            assert.ok(result !== null);
        });

        it('should register an event type with provider set in defaults', async () => {
            const ioEvents2 = new AdobeIOEvents({
                accessToken: accessToken,
                orgId: integration.technicalAccount.org,
                defaults: {
                    providerId: TEST_PROVIDER_ID,
                    providerMetadata: AdobeIOEvents.Metadata.ASSET_COMPUTE
                }
            });

            const result = await ioEvents2.registerEventType({
                code: TEST_EVENT_CODE,
                label: TEST_EVENT_LABEL,
                description: "This event indicates that something happened"
            });

            // no exception means test OK
            assert.ok(result !== undefined);
            assert.ok(result !== null);
        });
    });

    describe('#createJournal()', () => {

        it('should create a journal', async () => {
            const response = await ioEvents.createJournal({
                name: `${getIsoDate(DATE)} - JS test journal - create`,
                description: DESCRIPTION,
                providerId: TEST_PROVIDER_ID,
                eventTypes: [TEST_EVENT_CODE]
            });

            assert.ok(response !== undefined);
            assert.ok(response !== null);

            assert.ok(response.registration_id !== undefined);
            assert.ok(response.registration_id !== null);
            console.log("        created journal with registration id", response.registration_id);
            journalRegistrationIds.push(response.registration_id);
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
            .then(() => new Promise(resolve => setTimeout(resolve, 45 * 1000)))
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

        it('should send an event with provider set in defaults', async () => {

            const ioEvents2 = new AdobeIOEvents({
                accessToken: accessToken,
                orgId: integration.technicalAccount.org,
                defaults: {
                    providerId: TEST_PROVIDER_ID,
                    providerMetadata: AdobeIOEvents.Metadata.ASSET_COMPUTE
                }
            });

            await ioEvents2.sendEvent({
                code: TEST_EVENT_CODE,
                payload: {
                    hello: "world"
                }
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
        process.env.DELETE_JOURNAL_API_KEY = "cloudactions-service";
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
            delete process.env.DELETE_JOURNAL_API_KEY;
            console.log("cleanup done.");
        });
    });
});

describe('Test retry', () => {
    before( () => {
        const mockJwt = {
            decode: function() {
                return { clientId:"1245" };
            }
        }
        mockery.enable({
            warnOnUnregistered: false,
            useCleanCache: true
        });
        mockery.registerMock('jsonwebtoken', mockJwt);
    });

    beforeEach( () => {
        assert(nock.isDone());
        nock.cleanAll();
    });

    it('testing journal set up with retries using mocks', async () => {
        const AdobeIOEvents = require('../lib/events');
        const ioEvents2 = new AdobeIOEvents({
            accessToken: FAKE_ACCESS_TOKEN,
            orgId: FAKE_ORG_ID,
            clientId: FAKE_CLIENT_ID,
            defaults: {}
        });

        process.env.__OW_DEADLINE = Date.now() + 10000;

        createNocks("https://csm.adobe.io", "/csm/events/provider", "POST");
        let result = await ioEvents2.registerEventProvider({
            id: TEST_PROVIDER_ID,
            label: TEST_PROVIDER_LABEL,
            instanceId: TEST_PROVIDER_ID
        });
        assert.ok(result !== undefined);
        assert.ok(result !== null);
        console.log('Registered event provider.');

        createNocks("https://csm.adobe.io", "/csm/events/metadata", "POST");
        result = await ioEvents2.registerEventType({
            provider: TEST_PROVIDER_ID,
            code: TEST_EVENT_CODE,
            label: TEST_EVENT_LABEL,
            description: "Fake registering an event"
        });
        assert.ok(result !== undefined);
        assert.ok(result !== null);
        console.log('Registered event type. Listing consumer registrations');

        const consumerId = '1234';
        const applicationId = '4321';
        createNocks("https://api.adobe.io", `/events/organizations/${consumerId}/integrations/${applicationId}/registrations`, "GET");
        await ioEvents2.listConsumerRegistrations(consumerId, applicationId);

        console.log('Creating journal:');
        createNocks("https://api.adobe.io", `/events/organizations/${consumerId}/integrations/${applicationId}/registrations`, "POST");
        result = await ioEvents2.createJournal({
            name: 'fake journal',
            description: 'this journal is mocked',
            providerId: TEST_PROVIDER_ID,
            eventTypes: [TEST_EVENT_CODE],
            consumerId: consumerId,
            applicationId: applicationId
        });
        assert.ok(result !== undefined);
        assert.ok(result !== null);
        console.log('Journal created.');
    }).timeout(20000);

    it('should succeed in sending an event after three retries', async () => {
        const AdobeIOEvents = require('../lib/events');
        const ioEvents2 = new AdobeIOEvents({
            accessToken: FAKE_ACCESS_TOKEN,
            orgId: FAKE_ORG_ID,
            defaults: {}
        });
        createNocks("https://eg-ingress.adobe.io","/api/events", "POST" );
        await ioEvents2.sendEvent({
            code: 'test_event',
            payload: {
                hello: "world"
            }
        });
    });

    it('should succeed in sending an event after three retries when "as" attribute given into params', async () => {
        const AdobeIOEvents = require('../lib/events');

        const decodedToken = jsonwebtoken.decode(FAKE_ACCESS_TOKEN);
        const ioEvents2 = new AdobeIOEvents({
            accessToken: FAKE_ACCESS_TOKEN,
            orgId: FAKE_ORG_ID,
            as: decodedToken,
            defaults: {}
        });
        createNocks("https://eg-ingress.adobe.io","/api/events", "POST" );
        await ioEvents2.sendEvent({
            code: 'test_event',
            payload: {
                hello: "world"
            }
        });
    });

    it('should error by retry timeout after 300ms', async function() {
        const AdobeIOEvents = require('../lib/events');
        const ioEvents2 = new AdobeIOEvents({
            accessToken: FAKE_ACCESS_TOKEN,
            orgId: FAKE_ORG_ID,
            defaults: {}
        });

        let threw = false;

        //tried nock.times(5) but it does not update nock.pendingMocks().length
        for (let i = 0; i < 5; i++) {
            nock("https://eg-ingress.adobe.io")
            .matchHeader('Authorization',`Bearer ${FAKE_ACCESS_TOKEN}`)
            .matchHeader('x-ims-org-id',FAKE_ORG_ID)
            .post("/api/events")
            .reply(504);
        }
        try {
            await ioEvents2.sendEvent({
                code: 'test_event',
                payload: {
                    hello: "world"
                }
            },
            {
                retryMaxDuration:300,
                retryInitialDelay:100
            });
        }
        catch(e)  {
            console.log(`Expected error: ${e.message}`);
            assert.equal(e.message, "504 Gateway Timeout");
            threw = true;
        }
        assert.ok(threw);
        assert(! nock.isDone());
        //few retries happened and did not fail after 1 retry 
        console.log(nock.pendingMocks().length);
        assert.ok(nock.pendingMocks().length, 2);
        nock.cleanAll();
    }).timeout(2000);

    it('should error on first try with retry disabled (mocked)', async function() {
        const AdobeIOEvents = require('../lib/events');
        const ioEvents2 = new AdobeIOEvents({
            accessToken: FAKE_ACCESS_TOKEN,
            orgId: FAKE_ORG_ID,
            defaults: {}
        });

        process.env.__OW_DEADLINE = Date.now() + 10000;

        createNocks("https://csm.adobe.io", "/csm/events/provider", "POST");
        let threw = false;

        try {
            const result = await ioEvents2.registerEventProvider({
                id: TEST_PROVIDER_ID,
                label: TEST_PROVIDER_LABEL,
                instanceId: TEST_PROVIDER_ID
            }, false);
            assert.ok(result !== undefined);
            assert.ok(result !== null);
            console.log('Registered event provider.');
        }
        catch(e)  {
            console.log(`Expected error: ${e.message}`);
            assert.equal(e.message, "504 Gateway Timeout");
            threw = true;
        }
        assert.ok(threw);
        assert(! nock.isDone());
        assert.equal(nock.pendingMocks().length, 2);
        nock.cleanAll();
    }).timeout(8000);


    it('should error on first try (unmocked)', async function() {
        const AdobeIOEvents = require('../lib/events');
        const ioEvents2 = new AdobeIOEvents({
            accessToken: FAKE_ACCESS_TOKEN,
            orgId: FAKE_ORG_ID,
            defaults: {}
        });

        let threw = false;
        try {
            await ioEvents2.registerEventProvider({
                id: TEST_PROVIDER_ID,
                label: TEST_PROVIDER_LABEL,
                instanceId: TEST_PROVIDER_ID
            });
            console.log('Registered event provider.');
        }
        catch(e)  {
            console.log(`Expected error: ${e.message}`);
            assert.equal(e.message, "401 Unauthorized");
            threw = true;
        }
        assert.ok(threw);
    }).timeout(8000);

    after( () => {
        nock.cleanAll();
        mockery.deregisterMock('jsonwebtoken');
        mockery.disable();

    })
});

describe('Error handling', function (){
    it('handles http status', function(){
        const rewiredErrorHandler = rewire('../lib/events').__get__('handleFetchErrors');

        let dummyResponse = {
            ok: true,
            status: 200,
            message: "OK"
        };
        let result = rewiredErrorHandler(dummyResponse);
        assert.equal(result.ok, dummyResponse.ok);
        assert.equal(result.status, dummyResponse.status);
        assert.equal(result.message, dummyResponse.message);

        try{
            dummyResponse = {
                ok: false,
                status: 404
            };
            result = rewiredErrorHandler(dummyResponse);
        } catch(err){
            assert(err.statusCode, dummyResponse.status);
        }

        try{
            dummyResponse = {
                ok: false,
                status: 500
            };
            result = rewiredErrorHandler(dummyResponse);
        } catch(err){
            assert(err.statusCode, dummyResponse.status);
        }
    });
});