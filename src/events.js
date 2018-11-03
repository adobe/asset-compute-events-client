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

class AdobeIOEvents {

    /**
     * @typedef {Object} IoEventsOptionsDefaults
     * @property {String} providerId Default provider ID to use in API calls (optional, no spaces)
     * @property {String} consumerId short organization ID from console.adobe.io (not the IMS org ID), example: 105979
     * @property {String} applicationId integration ID from console.adobe.io, example: 47334
     */
    /**
     * @typedef {Object} IoEventsOptions
     * @property {String} orgId The IMS organization ID of the tenant (required)
     * @property {String} accessToken Valid access token from a technical account in the organization (required)
     * @property {IoEventsOptionsDefaults} defaults various default ids to use in API calls (optional)
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
        this.defaults = options.defaults;
    }

    /**
     * @typedef {Object} EventProvider
     * @property {String} id Unique id of the provider (no spaces). If not set will use the `options.providerId` passed in the constructor.
     * @property {String} label Label for the provider shown in UIs (required)
     * @property {String} grouping Group under which this provider should appaear in UIs (required)
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
                // 'X-Adobe-IO-AEM-Version': '6.4.0',
                // 'X-Adobe-Product': 'AEM',
                'x-ims-org-id': this.auth.orgId,
                'Authorization': `Bearer ${this.auth.accessToken}`
            },
            json: true,
            body: {
                provider: provider.id || this.defaults.providerId,
                grouping: provider.grouping,
                label: provider.label
            }
        });
    }

    /**
     * Deletes an event provider.
     * @param {String} providerId the id of the event provider to delete
     * @returns {Promise}
     */
    deleteEventProvider(providerId) {
        return request.delete({
            url: `https://csm.adobe.io/csm/events/provider/${providerId}`,
            headers: {
                'x-ims-org-id': this.auth.orgId,
                'Authorization': `Bearer ${this.auth.accessToken}`
            }
        });
    }

    /**
     * @typedef {Object} EventType
     * @property {String} provider The id of the provider for which this event type shall be registered. If not set will use the `options.providerId` passed in the constructor.
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
                'x-ims-org-id': this.auth.orgId,
                'Authorization': `Bearer ${this.auth.accessToken}`
            },
            json: true,
            body: {
                provider: eventType.provider || this.defaults.providerId,
                event_code: eventType.code,
                label: eventType.label,
                description: eventType.description
            }
        });
    }

    /**
     * @typedef {Object} Event
     * @property {String} provider The id of the provider sending this event. If not set will use the `options.providerId` passed in the constructor.
     * @property {String} code Event type name (required)
     * @property {Object} payload The custom event payload (required)
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
                'x-ims-org-id': this.auth.orgId,
                'x-api-key': this.auth.clientId,
                'Authorization': `Bearer ${this.auth.accessToken}`
            },
            json: {
                user_guid: this.auth.orgId,
                provider_id: event.provider || this.defaults.providerId,
                event_code: event.code,
                event: Buffer.from(JSON.stringify(event.payload)).toString('base64')
            },
            resolveWithFullResponse: true
        }).then(response => {
            // console.log(response.statusCode, response.statusMessage);
            // console.log(response.headers);
            if (response.statusCode === 200) {
                return Promise.resolve();
            } else {
                return Promise.reject(new Error(`sending event failed with ${response.statusCode} ${response.statusMessage}`));
            }
        });
    }

    /**
     * @typedef {Object} Journal
     * @property {String} name Name of the journal (required)
     * @property {String} description Description of the journal (required)
     * @property {Array} eventTypes List of event types (codes, as string) to subscribe to (at least 1 required)
     * @property {String} providerId Default provider ID to use in API calls (optional, no spaces)
     * @property {String} consumerId Short organization ID from console.adobe.io (not the IMS org ID), example: 105979
     * @property {String} applicationId Integration ID from console.adobe.io, example: 47334
     */
    /**
     * Create a new journal.
     * @param {Journal} journal The journal to create
     * @returns {Promise}
     */
    createJournal(journal) {
        const body =   {
            client_id: this.auth.clientId,
            name: journal.name,
            description: journal.description,
            events_of_interest: [],
            delivery_type: "JOURNAL",
        };

        for (const t of journal.eventTypes) {
            if (typeof t === 'string') {
                body.events_of_interest.push({
                    event_code: t,
                    provider: journal.providerId || this.defaults.providerId
                });
            } else if (typeof t === 'object') {
                body.events_of_interest.push({
                    event_code: t.type,
                    provider: t.providerId || this.defaults.providerId
                });
            }
        }

        const consumerId = journal.consumerId || this.defaults.consumerId;
        const applicationId = journal.applicationId || this.defaults.applicationId;

        return request.post({
            url: `https://api.adobe.io/events/organizations/${consumerId}/integrations/${applicationId}/registrations`,
            headers: {
                'x-api-key': this.auth.clientId,
                'x-ims-org-id': this.auth.orgId,
                'Authorization': `Bearer ${this.auth.accessToken}`
            },
            json: true,
            body: body
        });
    }

    /**
     * Deletes a journal or webhook registration.
     * @param {String} registrationId the id of the event listener registration to delete
     * @returns {Promise}
     */
    deleteJournal(registrationId) {
        if (process.env.DELETE_JOURNAL_API_KEY === undefined) {
            return Promise.reject("Cannot invoke ioEvents.deleteJournal() because special API key is not set as environment variable: DELETE_JOURNAL_API_KEY");
        }
        return request.delete({
            url: `https://csm.adobe.io/csm/webhooks/${this.auth.clientId}/${registrationId}`,
            headers: {
                'x-ims-org-id': this.auth.orgId,

                'x-api-key': process.env.DELETE_JOURNAL_API_KEY,

                'x-ams-consumer-id': this.defaults.consumerId,
                'x-ams-application-id': this.defaults.applicationId,
                'Authorization': `Bearer ${this.auth.accessToken}`
            }
        });
    }


    /**
     * Get recent events from a journal.
     * @param {String} journalUrl Complete URL of the journal to read from (required)
     * @param {Number} pageSize Maximum number of most recdent events to return (optional)
     * @param {String} from ID of the first event to be returned (optional)
     * @returns {Promise} with the response json including the events
     */
    getEventsFromJournal(journalUrl, pageSize, from) {
        return request({
            url: journalUrl,
            headers: {
                'x-api-key': this.auth.clientId,
                'x-ims-org-id': this.auth.orgId,
                'Authorization': `Bearer ${this.auth.accessToken}`
            },
            qs: {
                pageSize: pageSize,
                from: from
            },
            json: true
        });
    }
}

/** Known groups for event providers */
AdobeIOEvents.Groups = {
    MARKETING_CLOUD: "Marketing Cloud",
    DOCUMENT_CLOUD: "Document Cloud",
    CREATIVE_CLOUD: "Creative Cloud"
};

/**
 * The JWT/Adobe ID meta scopes required for I/O Events API calls.
 * For use in AdobeAuthClient.createAccessToken().
 */
AdobeIOEvents.JWT_META_SCOPES = [
    "ent_adobeio_sdk",
    "event_receiver_api"
];

module.exports = AdobeIOEvents;