/*
 * Copyright 2020 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */

/* eslint-env mocha */

'use strict';

// Adobe IO Events journaling API
// https://www.adobe.io/apis/experienceplatform/events/docs.html#!adobedocs/adobeio-events/master/intro/journaling_api.md

const AdobeIOEvents = require('../lib/events');
const AdobeIOEventEmitter = require('../lib/eventemitter');
const sleep = require("util").promisify(setTimeout);
const nock = require('nock');
const assert = require('assert');

const TEST_ACCESS_TOKEN = 'cdsj234fcdlr4';
const TEST_ORG_ID = 'fakeorgId';

const JOURNAL_ORIGIN = "https://adobeioevents.com";
const JOURNAL_START = "/journal/1";
const JOURNAL_START_LATEST = `${JOURNAL_START}?latest=true`;
const JOURNAL_END = "/journal/end";
const JOURNAL_URL = `${JOURNAL_ORIGIN}${JOURNAL_START}`;

const TEST_EVENT = {
    id: "ID",
    type: "myevent"
};

function createAdobeIOEventEmitter(opts) {
    const ioEvents = new AdobeIOEvents({
        accessToken: TEST_ACCESS_TOKEN,
        orgId: TEST_ORG_ID
    });

    const emitter = new AdobeIOEventEmitter(ioEvents, JOURNAL_URL, Object.assign({
        latest: true,
        interval: 50
    }, opts));

    const events = [];
    emitter.on("event", event => events.push(event));

    return {
        emitter,
        events
    };
}

function eventBody(...events) {
    return {
        events: [...events]
    };
}

function eventHeaders(next, retryAfter) {
    return {
        link: `<${next}>; rel="next"`,

        // in seconds
        retryAfter: retryAfter || "1"
    };
}

function nockJournalEnd() {
    nock(JOURNAL_ORIGIN)
        .get(JOURNAL_END)
        .query(true)
        // empty response, link to itself
        .reply(204, null, eventHeaders(JOURNAL_END, 10))
        .persist();
}

describe('eventemitter.js', function() {

    afterEach( () => {
        nock.cleanAll();
    });

    describe('success', function() {

        it("should get events from the journal", async function() {
            nock(JOURNAL_ORIGIN)
                .get(JOURNAL_START_LATEST)
                .reply(200, eventBody(TEST_EVENT), eventHeaders(JOURNAL_END));
            nockJournalEnd();

            const { events } = createAdobeIOEventEmitter();

            await sleep(100);

            assert.strictEqual(events.length, 1);
            assert.deepStrictEqual(events[0], TEST_EVENT);
        });
    });

    describe('error handling', function() {

        it("should handle network error on first request of polling (NUI-878)", async function() {
            // first request fails
            nock(JOURNAL_ORIGIN).get(JOURNAL_START).query(true).replyWithError({
                message: "connect ECONNREFUSED 52.45.101.56:443",
                code: "ECONNREFUSED",
            });
            // second succeeds
            nock(JOURNAL_ORIGIN)
                .get(JOURNAL_START_LATEST)
                .reply(200, eventBody(TEST_EVENT), eventHeaders(JOURNAL_END));
            nockJournalEnd();

            const { events, emitter } = createAdobeIOEventEmitter();
            // must listen for errors to prevent UnhandledPromiseRejectionWarning and aborted polling
            emitter.on("error", () => {});

            await sleep(200);

            assert.strictEqual(events.length, 1);
            assert.deepStrictEqual(events[0], TEST_EVENT);
        });
    });
});