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

const assert = require('assert');
const AdobeAuth = require('../lib/auth');
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

        it('should create an access token', async function() {
            const accessToken = await new AdobeAuth().createAccessToken(integration.technicalAccount, ["ent_adobeio_sdk"]);

            assert.ok(accessToken !== undefined);
            assert.ok(accessToken !== null);

            jsonwebtoken.decode(accessToken);
        });
    });
});
