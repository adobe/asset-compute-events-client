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

const AdobeIOEvents = require('../src/events');
const AdobeAuth = require('../src/auth');
const assert = require('assert');
const os = require("os");
const util = require('util');
const testconfig = require('./testconfig');

// ---------------------------------------------------
// helpers

function getIsoDate(date) {
    return date.getFullYear() + '-' +
            ('0'+ (date.getMonth()+1)).slice(-2) + '-' +
            ('0'+ date.getDate()).slice(-2);
}

// promise sleep (duration in ms)
function sleep(duration) {
    return new Promise(resolve => setTimeout(resolve, duration));
}

// promise retry (interval in ms, fn must return a promise)
function retry(maxRetries, interval, fn) {
    return fn().catch(err => {
        console.log("        retries left: ", maxRetries);
        if (maxRetries > 1) {
            // wait between retries
            return sleep(interval)
                // then retry again, but count down the maxRetries
                .then(() => retry(maxRetries - 1, interval, fn));
        } else {
            // max retries hit, stop and fail
            return Promise.reject(err);
        }
    });
}

function assertEventInJournal(ioEvents, journalUrl, timeout, eventMatcher) {
    const POLL_INTERVAL = 2000;
    return retry(timeout/POLL_INTERVAL, POLL_INTERVAL, function() {
        return ioEvents
            .getEventsFromJournal(journalUrl)
            .then(events => {
                console.log("        ", util.inspect(events, {showHidden: false, depth: null}));
                // find matching event using eventMatcher function
                if (events.events && events.events.some(eventMatcher)) {
                    return Promise.resolve();
                } else {
                    return Promise.reject();
                }
            });
    })
    .then(() => assert(true))
    .catch(() => assert(false, "event not received within timeout"));
}

// ---------------------------------------------------

const DATE = new Date();

// TODO: enable unique providers using timestamp again ONCE we have a stable cleanup
// const TEST_PROVIDER_ID = `__JS_CLIENT_TEST_alexkli-macbook-pro.macromedia.com_2018-10-16`;
// const TEST_PROVIDER_LABEL = `JS Client Test alexkli-macbook-pro.macromedia.com 2018-10-16`;
// const TEST_PROVIDER_ID    = `__adobe-io-events-client__test__${os.hostname()}`;
// const TEST_PROVIDER_LABEL = `Test adobe-io-events-client - ${os.hostname()}`;
const TEST_PROVIDER_ID    = `__adobe-io-events-client__test__${os.hostname()}__${DATE.getTime()}`;
const TEST_PROVIDER_LABEL = `Test adobe-io-events-client - ${os.hostname()} (${DATE.getTime()})`;

const TEST_EVENT_CODE = "test_event";
const TEST_EVENT_LABEL = "Test Event";

const DESCRIPTION = "Automatically created by test code from @adobe-internal-nui/adobe-io-events-client. Can be deleted if it was left over.";

// ---------------------------------------------------
// test cases

describe('AdobeIOEvents', function() {
    let ioEvents;
    let integration;
    let accessToken;

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
                    console.log("        event type       : ", TEST_EVENT_CODE)
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
                grouping: AdobeIOEvents.Groups.MARKETING_CLOUD
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
                    providerId: TEST_PROVIDER_ID
                }
            });

            return ioEvents2.registerEventProvider({
                label: TEST_PROVIDER_LABEL,
                grouping: AdobeIOEvents.Groups.MARKETING_CLOUD
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
                    providerId: TEST_PROVIDER_ID
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
                name: "js test journal",
                description: DESCRIPTION,
                providerId: TEST_PROVIDER_ID,
                eventTypes: [TEST_EVENT_CODE]
            })
            .then(response => {
                console.log(response);
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
                grouping: AdobeIOEvents.Groups.MARKETING_CLOUD
            })
            .then(() => {
                // console.log("        event provider response", response);
                return ioEvents.registerEventType({
                    provider: TEST_PROVIDER_ID,
                    code: TEST_EVENT_CODE,
                    label: TEST_EVENT_LABEL,
                    description: "This event indicates that something happened"
                })
            })
            .then(() => {
                // console.log("        event type response", response);
                return ioEvents.createJournal({
                    name: `temporary js test journal ${timestamp}`,
                    description: DESCRIPTION,
                    providerId: TEST_PROVIDER_ID,
                    eventTypes: [TEST_EVENT_CODE]
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
            .then(response => {
                console.log("        sent event.");

                return assertEventInJournal(
                    ioEvents,
                    journalUrl,
                    DELIVERY_TIMEOUT,
                    event => event.event.timestamp === timestamp
                ).then(() => {
                    console.timeEnd('        send event to journal delivery');
                });
            });
        });

        it('should send an event with provider set in defaults', () => {

            const ioEvents2 = new AdobeIOEvents({
                accessToken: accessToken,
                orgId: integration.technicalAccount.org,
                defaults: {
                    providerId: TEST_PROVIDER_ID
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

    after(function() {
        // TODO: remove the event provider and all it's event types
        // requires use of DELETE /csm/events/provider/{id} which is not working right now

        console.log("cleaning up...");
    });
});