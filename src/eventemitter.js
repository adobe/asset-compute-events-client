/**
 *  ADOBE CONFIDENTIAL
 *  __________________
 *
 *  Copyright 2019 Adobe
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
                    })
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
        // make sure poll() doesn't trigger in the future
        clearTimeout(this.timeout);

        // if polling, wait for the poll() method to finish
        const self = this;
        if (this.isPolling) {
            return new Promise(resolve => {
                self.stopCallback = resolve;
            });
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
