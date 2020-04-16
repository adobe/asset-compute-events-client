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