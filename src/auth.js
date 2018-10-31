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

const fs = require('fs');
const request = require('request-promise');
const jsonwebtoken = require('jsonwebtoken');

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
     * @typedef {Object} AdobeIOIntegration
     * @property {String} clientId Client id (API key) of the technical account, such as "1234-5678-9876-5433"
     * @property {String} technicalAccountId Id of the technical account, such as "12345667EDBA435@techacct.adobe.com"
     * @property {String} orgId Organization id, such as "8765432DEAB65@AdobeOrg"
     * @property {String} clientSecret Client secret of the the technical account
     * @property {String} privateKeyFile Path to the private key file PEM encoded
     */
    /**
     * Creates an access token for a technical account, returned in a promise.
     * @param {AdobeIOIntegration} integration Integration (technical account) from console.adobe.io (required)
     * @param {Array} metaScopes Meta scopes to use, passed as string array
     * @returns {Promise}
     */
    createAccessToken(integration, metaScopes) {
        const adobeLoginHost = this.config.adobeLoginHost || ADOBE_ID_PRODUCTION_HOST;

        // 1. collect full metascopes
        const jwtPayload = {};
        metaScopes = metaScopes || [];
        metaScopes.forEach(scope => {
            jwtPayload[`${adobeLoginHost}/s/${scope}`] = true;
        });

        // 2. build & sign jwt
        const privateKey = fs.readFileSync(integration.privateKeyFile);
        const jwt = jsonwebtoken.sign(jwtPayload, privateKey, {
            algorithm: "RS256",
            expiresIn: "5m", // we only need the JWT once below, so make it short-lived
            subject: integration.technicalAccountId,
            issuer: integration.orgId,
            audience: `${adobeLoginHost}/c/${integration.clientId}`
        })

        // 3. exchange against access token
        return request.post({
            url: `${adobeLoginHost}/ims/exchange/v1/jwt`,
            form: {
                client_id: integration.clientId,
                client_secret: integration.clientSecret,
                jwt_token: jwt
            }
        }).then(response => {
            return JSON.parse(response).access_token;
        });
    }
}

module.exports = AdobeAuth;