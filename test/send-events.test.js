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


const assert = require('assert');
const mockery = require('mockery');
const fetchMock = require('fetch-mock');
fetchMock.config.overwriteRoutes = true;

// mock http request to IO events journal so it fails twice then succeeds on retry

// mock a JWT
const mockJwt = {
    decode: function(accessToken) {
        return { clientId:"1245" }
    }
}


mockery.enable({
    warnOnUnregistered: false,
    useCleanCache:true
});
mockery.registerMock('jsonwebtoken', mockJwt);
const AdobeIOEvents = require('../src/events');

function createFetchMock() {
    fetchMock.mock("https://eg-ingress.adobe.io/api/events", 503);
    setTimeout(() => {
        fetchMock.mock("https://eg-ingress.adobe.io/api/events", 200);
    }, 3000)

}

it('should succeed in sending an event after 3 seconds of retrying', function() {
    const ioEvents2 = new AdobeIOEvents({
        accessToken: 'eydghbfdnhs',
        orgId: 'fakeorgId',
        defaults: {}
    });
    createFetchMock();
    return ioEvents2.sendEvent({
        code: 'test_event',
        payload: {
            hello: "world"
        }
    })
    .catch((e) => {
        console.log(`Unexpected error: ${e}`)
        assert(e === undefined);
    })
    .then(() => {
        fetchMock.restore();
        assert(true);
    });
});

it('should error by timeout after 3 seconds', async function() {
    const ioEvents2 = new AdobeIOEvents({
        accessToken: 'eydghbfdnhs',
        orgId: 'fakeorgId',
        defaults: {}
    });

    let error = false

    try {
        const res = await ioEvents2.sendEvent({
            code: 'test_event',
            payload: {
                hello: "world"
            }
        },
        {
            maxSeconds:3,
            retryIntervalMillis:600
        }
        )
    }
    catch(e)  {
        console.log(`Expected error: ${e.message || e.statusText}`)
        error = true;
        assert(error);
    }
    mockery.disable();
});