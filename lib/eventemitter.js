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

'use strict';

const EventEmitter = require('events');
const { appendQueryParams } = require('./util');
const DEFAULT_INTERVAL = 2000;

/**
 * Event fired before a polling request is made to Adobe I/O events
 *
 * @event AdobeIOEventEmitter#poll
 */
/**
 * Event fired for each event in the Adobe I/O event journal
 *
 * @event AdobeIOEventEmitter#event
 * @type {object}
 * @property {object} event Adobe I/O event
 */
/**
 * Error event fired on polling failure, will cause polling to start from journalUrl
 *
 * @event AdobeIOEventEmitter#error
 * @type {Error}
 */
class AdobeIOEventEmitter extends EventEmitter {

    /**
     * Callback
     *
     * @callback EventPredicate
     * @param {Object} event Event to check
     * @returns {Boolean} true if event matched predicate
     */
    /**
     * Find an event in the journal
     *
     * @param {AdobeIOEvents} ioEvents AdobeIOEvents instance
     * @param {String} journalUrl Complete URL of the journal
     * @param {Number} timeout Amount of time to wait until event is found (ms)
     * @param {EventPredicate} predicate
     * @returns {Promise} resolves to event that matched predicate
     */
    static findEventInJournal(ioEvents, journalUrl, timeout, predicate) {
        const endTime = Date.now() + timeout;
        return new Promise((resolve, reject) => {
            const emitter = new AdobeIOEventEmitter(ioEvents, journalUrl);
            emitter.on('poll', () => {
                if (Date.now() >= endTime) {
                    emitter.stop().then(() => {
                        reject(Error('Timeout, unable to find event'));
                    });
                }
            });
            emitter.on('event', event => {
                if (predicate(event)) {
                    emitter.stop().then(() => {
                        resolve(event);
                    });
                }
            });
            emitter.on('error', error => {
                emitter.stop().then(() => {
                    reject(error);
                });
            });
        });
    }

    /**
     * @typedef {Object} AdobeIOEventEmitterOptions
     * @property {String} restart Restart at a previous received 'next' link (optional)
     * @property {Boolean} latest Retrieve latest events on restart or error (optional)
     * @property {Number} interval Override interval at which to poll I/O events (optional)
     */
    /**
     * Construct and start an Adobe I/O event emitter.
     *
     * @param {AdobeIOEvents} ioEvents AdobeIOEvents instance
     * @param {String} journalUrl Complete URL of the journal
     * @param {AdobeIOEventEmitterOptions} options Query options to send with the URL
     */
    constructor(ioEvents, journalUrl, options) {
        super();
        this.ioEvents = ioEvents;
        this.journalUrl = appendQueryParams(journalUrl, {
            latest: options && options.latest
        });
        this.next = (options && options.restart) || this.journalUrl;
        this.interval = options && options.interval;
        this.timeout = setTimeout(self => self.poll(), 0, this);
    }

    /**
     * Stop the emitter
     */
    async stop() {
        // if polling, wait for the poll() method to finish
        const self = this;
        if (this.isPolling) {
            return new Promise(resolve => {
                self.stopCallback = () => {
                    clearTimeout(this.timeout);
                    resolve();
                };
            });
        } else {
            // make sure poll() doesn't trigger in the future
            clearTimeout(this.timeout);
        }
    }

    /**
     * Poll for new events
     */
    async poll() {
        this.emit('poll');

        this.isPolling = true;
        try {
            const response = await this.ioEvents.getEventsFromJournal(this.next);
            this.next = response.link.next;

            // emit events, determine timeout
            let timeout = 0;
            if (response.events) {
                // emit each event, issue another poll() immediately
                // since more events may be pending
                for (const event of response.events) {
                    this.emit("event", event);
                }
            } else {
                // no events, wait to requested amount of time
                timeout = this.interval || response.retryAfter || DEFAULT_INTERVAL;
            }

            // initiate
            this.timeout = setTimeout(self => self.poll(), timeout, this);
        } catch (error) {
            // error - start fresh from journalUrl
            this.emit("error", error);
            this.next = this.journalUrl;
            this.timeout = setTimeout(self => self.poll(), this.interval, this);
        } finally {
            this.isPolling = false;
            if (this.stopCallback) {
                this.stopCallback();
            }
        }
    }
}

module.exports = AdobeIOEventEmitter;
