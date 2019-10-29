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

/* eslint-disable dot-notation */

"use strict";

const querystring = require("querystring");

/**
 * Appends querystring key/value pairs to a url
 *
 * @param {String} url URL
 * @param {Object} qs Querystring key/value pairs
 * @returns {String} URL with appended querystring key/value pairs
 */
function appendQueryParams(url, qs) {
    let result = url;
    if (qs) {
        let separator = (url.indexOf('?') >= 0) ? '&' : '?';
        for (const key of Object.getOwnPropertyNames(qs)) {
            if (qs[key]) {
                const escKey = querystring.escape(key);
                const escValue = querystring.escape(qs[key]);
                result += `${separator}${escKey}=${escValue}`;
                separator = '&';
            }
        }
    }
    return result;
}

module.exports = {
    appendQueryParams
}