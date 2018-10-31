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

const AdobeAuth = require('../src/auth');
const testconfig = require('./testconfig');
const jsonwebtoken = require('jsonwebtoken');

describe('AdobeAuth', function() {

    let integration;

    before("init test config", function() {
        integration = testconfig.loadIntegration();
        if (integration === undefined) {
            this.test.parent.pending = true;
            this.skip();
            return Promise.resolve();
        }
    });

    describe('createAccessToken()', function() {

        it('should create an access token', function() {
            return new AdobeAuth()
                .createAccessToken(integration, ["ent_adobeio_sdk"])
                .then(accessToken => {
                    jsonwebtoken.decode(accessToken);
                });
        });
    });
});
