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

const request = require('request-promise');
// request.debug = true;
const jsonwebtoken = require('jsonwebtoken');

class AdobeIOEventsClient {

    /**
     * @typedef {Object} IoEventsOptions
     * @property {String} orgId The IMS organization ID of the tenant
     * @property {String} accessToken Valid access token from a technical account in the organization
     */
    /**
     * Creates a new Adobe I/O events client with specific credentials to use.
     *
     * https://www.adobe.io/apis/cloudplatform/events/documentation.html
     *
     * @param {IoEventsOptions} options Required configurations such a organization and access token.
     */
    constructor(options) {
        if (!options) {
            throw "Must provide options argument with accessToken and orgId";
        }
        const jwt = jsonwebtoken.decode(options.accessToken);
        this.auth = {
            accessToken: options.accessToken,
            orgId: options.orgId,
            clientId: jwt.client_id
        };
    }

    /**
     * @typedef {Object} EventProvider
     * @property {String} id Unique id of the provider (no spaces)
     * @property {String} label Label for the provider shown in UIs
     * @property {String} grouping Group under which this provider should appaear in UIs
     */
    /**
     * Register a new event provider or update an existing one.
     * @param {EventProvider} provider The event provider to register
     * @returns {Promise}
     */
    registerEventProvider(provider) {
        return request.post({
            url: 'https://csm.adobe.io/csm/events/provider',
            headers: {
                'Content-Type': 'application/json',
                // 'X-Adobe-IO-AEM-Version': '6.4.0',
                // 'X-Adobe-Product': 'AEM',
                'x-ims-org-id': this.auth.orgId,
                'Authorization': `Bearer ${this.auth.accessToken}`
            },
            json: true,
            body: {
                provider: provider.id,
                grouping: provider.grouping,
                label: provider.label
            }

        });
    }

    /**
     * @typedef {Object} EventType
     * @property {String} provider The id of the provider for which this event type shall be registered
     * @property {String} code Unique event type name (no spaces)
     * @property {String} label Label for the event type shown in UIs
     * @property {String} description More elaborate description of the event type
     */
    /**
     * Register a new event type or update an existing one.
     * @param {EventType} eventType The event type to register
     * @returns {Promise}
     */
    registerEventType(eventType) {
        return request.post({
            url: 'https://csm.adobe.io/csm/events/metadata',
            headers: {
                'Content-Type': 'application/json',
                'x-ims-org-id': this.auth.orgId,
                'Authorization': `Bearer ${this.auth.accessToken}`
            },
            json: true,
            body: {
                provider: eventType.provider,
                event_code: eventType.code,
                label: eventType.label,
                description: eventType.description
            }
        });
    }

    /**
     * @typedef {Object} Event
     * @property {String} provider The id of the provider sending this event
     * @property {String} code Event type name
     * @property {Object} payload The custom event payload
     */
    /**
     * Send an event
     * @param {Event} event The event to send
     * @returns {Promise}
     */
    sendEvent(event) {
        return request.post({
            url: 'https://eg-ingress.adobe.io/api/events',
            headers: {
                'Content-Type': 'application/json',
                'x-ims-org-id': this.auth.orgId,
                'x-api-key': this.auth.clientId,
                'Authorization': `Bearer ${this.auth.accessToken}`
            },
            body: JSON.stringify({
                user_guid: this.auth.orgId,
                provider_id: event.provider,
                event_code: event.code,
                event: Buffer.from(JSON.stringify(event.payload)).toString('base64')
            })
        });
    }
}

/** Known groups for event providers */
AdobeIOEventsClient.Groups = {
    MARKETING_CLOUD: "Marketing Cloud",
    DOCUMENT_CLOUD: "Document Cloud",
    CREATIVE_CLOUD: "Creative Cloud"
};

module.exports = AdobeIOEventsClient;
