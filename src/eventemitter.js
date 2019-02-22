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
const querystring = require('querystring');
const DEFAULT_INTERVAL = 2000;

/**
 * Appends querystring key/value pairs to a url
 *
 * @param {String} url URL
 * @param {Object} qs Querystring key/value pairs
 * @returns {String} URL with appended querystring key/value pairs
 */
function appendQueryParams(url, qs) {
    let separator = (url.indexOf('?') >= 0) ? '&' : '?';
    let result = url;
    for (const key of Object.getOwnPropertyNames(qs)) {
        if (qs[key]) {
            const escKey = querystring.escape(key);
            const escValue = querystring.escape(qs[key]);
            result += `${separator}${escKey}=${escValue}`;
            separator = '&';
        }
    }
    return result;
}

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
     * @property {Number} interval Default interval at which to poll I/O events (optional)
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
        this.restart = options && options.restart || null
        this.next = this.restart || this.journalUrl
        this.interval = options && options.interval || DEFAULT_INTERVAL
        setImmediate(self => self.poll(), this);
    }

    /**
     * Stop the emitter
     * 
     * @returns {Promise} resolved when emitter finishes.
     */
    stop() {
        const self = this;
        return new Promise(resolve => {
            self.stopCallback = () => {
                resolve();
            }
        });
    }

    /**
     * Poll for new events
     */
    poll() {
        this.emit('poll');
        // early exit if asked to stop
        if (this.stopCallback) {
            return this.stopCallback();
        }
        return Promise.resolve()
            .then(() => {
                return this.ioEvents.getEventsFromJournal(this.next);
            })
            .then(response => {
                if (!response.events && this.restart) {
                    // TODO: The validate API has not been implemented yet by the I/O events team. 
                }
                return response;
            })
            .then(response => {
                this.next = response.link.next;
                this.restart = null;
                if (response.events) {
                    // emit each event, issue another poll() immediately 
                    // since more events may be pending
                    for (const event of response.events) {
                        this.emit("event", event);
                    }
                    return 0;
                } else {
                    // no events, wait to requested amount of time
                    return response.retryAfter || this.interval;
                }
            })
            .then(timeout => {
                if (this.stopCallback) {
                    // emit is synchronous, make sure to not issue another timeout/immediate if any 
                    // listener called stop() while handling the emitted events
                    this.stopCallback();
                } else if (timeout === 0) {
                    setImmediate(self => self.poll(), this); 
                } else {
                    setTimeout(self => self.poll(), timeout, this);
                }
            })
            .catch(error => {
                // error - start fresh from journalUrl
                this.emit("error", error);
                this.next = this.journalUrl;
                this.restart = null;
                setTimeout(self => self.poll(), this.interval, this);
            });
    }

}

module.exports = AdobeIOEventEmitter;
