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

const fsPromises = require('fs').promises;
const fetch = require('@adobe/node-fetch-retry');
const jsonwebtoken = require('jsonwebtoken');
const FormData = require('form-data');

const ADOBE_ID_PRODUCTION_HOST = "https://ims-na1.adobelogin.com";

class AdobeAuth {

    /**
     * @typedef {Object} AuthOptions
     * @property {String} adobeLoginHost the Adobe ID/Login hostname, such as https://ims-na1.adobelogin.com (optional, defaults to production)
     */
    /**
     * Creates a new Adobe ID authentication client.
     *
     * @param {AuthOptions} config custom options
     */
    constructor(config) {
        this.config = config || {};
    }

    /**
     * @typedef {Object} AdobeIdTechnicalAccount
     * @property {String} id Id of the technical account, such as "12345667EDBA435@techacct.adobe.com"
     * @property {String} org Organization id, such as "8765432DEAB65@AdobeOrg"
     * @property {String} clientId Client id (API key) of the technical account, such as "1234-5678-9876-5433"
     * @property {String} clientSecret Client secret of the the technical account
     * @property {String} privateKey Path to the private key file PEM encoded (either this or `privateKeyFile` is required)
     * @property {String} privateKeyFile Private key PEM encoded as string (either this or `privateKey` is required)
     */
    /**
     * Creates an access token for a technical account, returned in a promise.
     * @param {AdobeIdTechnicalAccount} technicalAccount Technical account from console.adobe.io (required)
     * @param {Array} metaScopes Meta scopes to use, passed as string array
     * @returns {Promise}
     */
    async createAccessToken(technicalAccount, metaScopes) {
        const adobeLoginHost = this.config.adobeLoginHost || ADOBE_ID_PRODUCTION_HOST;

        // 1. collect full metascopes
        const jwtPayload = {};
        metaScopes = metaScopes || [];
        metaScopes.forEach(scope => {
            jwtPayload[`${adobeLoginHost}/s/${scope}`] = true;
        });

        // 2. build & sign jwt
        if (technicalAccount.privateKey === undefined) {
            technicalAccount.privateKey = await fsPromises.readFile(technicalAccount.privateKeyFile, 'utf-8');
        }

        const jwt = jsonwebtoken.sign(jwtPayload, technicalAccount.privateKey, {
            algorithm: "RS256",
            expiresIn: "5m", // we only need the JWT once below, so make it short-lived
            subject: technicalAccount.id,
            issuer: technicalAccount.org,
            audience: `${adobeLoginHost}/c/${technicalAccount.clientId}`
        });

        // 3. exchange against access token
        const url = `${adobeLoginHost}/ims/exchange/v1/jwt`;

        const formData = new FormData();
        formData.append('client_id', technicalAccount.clientId);
        formData.append('client_secret', technicalAccount.clientSecret);
        formData.append('jwt_token', jwt);

        let response = await fetch(url, {
            method: 'POST',
            headers:formData.getHeaders(),
            body: formData,
            retryOptions: false
        });
        if (!response.ok) {
            throw Error(`errorCode:${response.status}, message:${response.statusText}`);
        }
        response = await response.json();
        return response.access_token;
    }
}

module.exports = AdobeAuth;
