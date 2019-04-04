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

/* eslint-disable dot-notation */

'use strict';

const request = require('request-promise-native');
// request.debug = true;
const jsonwebtoken = require('jsonwebtoken');
const httplinkheader = require('http-link-header');

/**
 * Parse the Link header
 * Spec: @{link https://tools.ietf.org/html/rfc5988#section-5}
 *
 * @param {String|URL} base URL used to resolve relative uris
 * @param {String} header Link header value
 * @returns {Object} Parsed link heeader
 */
function parseLinkHeader(base, header) {
    const result = {};
    const links = httplinkheader.parse(header);
    for (const link of links.refs) {
        result[link.rel] = new URL(link.uri, base).href;
    }
    return result;
}

/**
 * Parse the Retry-After header
 * Spec: {@link https://tools.ietf.org/html/rfc7231#section-7.1.3}
 *
 * @param {String} header Retry-After header value
 * @returns Number of milliseconds to sleep until the next call to getEventsFromJournal
 */
function parseRetryAfterHeader(header) {
    if (header.match(/^[0-9]+$/)) {
        return parseInt(header) * 1000;
    } else {
        return Date.parse(header) - Date.now();
    }
}

class AdobeIOEvents {

    /**
     * @typedef {Object} IoEventsOptionsDefaults
     * @property {String} providerId Default provider ID to use in API calls (optional, no spaces)
     * @property {String} providerMetadata Default provider metadata @see {@link AdobeIOEvents.Metadata}
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
     * @property {String} grouping Group under which this provider should appear in UIs (required)
     * @property {String} metadata Provider metadata, @see {@link AdobeIOEvents.Metadata} (required)
     * @property {String} instanceId Unique instance identifier (required when metadata is set to acs, aem, or asset_compute)
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
                label: provider.label,
                provider_metadata: provider.metadata || this.defaults.providerMetadata,
                instance_id: provider.instanceId
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
                event: Buffer.from(JSON.stringify(event.payload || {})).toString('base64')
            },
            resolveWithFullResponse: true
        }).then(response => {
            // console.log(response.statusCode, response.statusMessage);
            // console.log(response.headers);
            if (response.statusCode === 200) {
                return Promise.resolve();
            } else {
                // 204 No Content status should be considered a failure by us.
                // It means that the event was accepted, but there were no registrations interested in 
                // the event. In this case it means that the journal has not been fully created yet. 
                // The result is that the posted event is lost.
                return Promise.reject(new Error(`sending event failed with ${response.statusCode} ${response.statusMessage}`));
            }
        });
    }

    /**
     * List event consumer registrations (journals or webhooks) for the given integration (consumer + application id).
     *
     * @property {String} consumerId short organization ID from console.adobe.io (not the IMS org ID), example: 105979
     * @property {String} applicationId integration ID from console.adobe.io, example: 47334
     * @returns {Promise}
     */
    listConsumerRegistrations(consumerId, applicationId) {
        consumerId = consumerId || this.defaults.consumerId;
        applicationId = applicationId || this.defaults.applicationId;

        return request({
            url: `https://api.adobe.io/events/organizations/${consumerId}/integrations/${applicationId}/registrations`,
            headers: {
                'x-api-key': this.auth.clientId,
                'x-ims-org-id': this.auth.orgId,
                'Authorization': `Bearer ${this.auth.accessToken}`
            },
            json: true
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
     * @typedef {Object} EventsFromJournalOptions
     * @property {Boolean} latest Retrieve latest events (optional)
     * @property {String} seek Retrieve events starting at a relative time, e.g. -PT1H (optional)
     * @property {Number} limit Maximum number of events to retrieve (optional)
     */
    /**
     * Get recent events from a journal.
     * @param {String} journalUrl URL of the journal or 'next' link to read from (required)
     * @param {EventsFromJournalOptions} options Query options to send with the URL
     * @returns {Promise} with the response json includes events and links (if available)
     */
    getEventsFromJournal(journalUrl, options) {
        return request({
            url: journalUrl,
            headers: {
                'x-api-key': this.auth.clientId,
                'Authorization': `Bearer ${this.auth.accessToken}`,
                'Accept': 'application/vnd.adobecloud.events+json'
            },
            qs: options,
            resolveWithFullResponse: true,
            json: true
        }).then(response => {
            if ((response.statusCode === 200) || (response.statusCode === 204)) {
                const result = Object.assign({}, response.body);
                const linkHeader = response.headers['link'];
                if (linkHeader) {
                    result.link = parseLinkHeader(journalUrl, linkHeader);
                }
                const retryAfterHeader = response.headers['retry-after'];
                if (retryAfterHeader) {
                    result.retryAfter = parseRetryAfterHeader(retryAfterHeader);
                }
                return result;
            } else {
                throw Error(`get journal events failed with ${response.statusCode} ${response.statusMessage}`);
            } 
        });
    }
}

/** Known metadata values for event providers */
AdobeIOEvents.Metadata = {
    ACS: "acs",
    AEM: "aem",
    ASSET_COMPUTE: "asset_compute",
    CCSTORAGE: "ccstorage",
    CLOUDMANAGER: "cloudmanager",
    PROFILE: "profile",
    STOCK: "stock",
    TRIGGERS: "triggers",
    XD: "xd",
    XD_ANNOTATIONS: "xd_annotations",
    AEP_STREAMING_SERVICES: "aep_streaming_services",
    GDPR_EVENTS: "gdpr_events",
    TEST: "test"
}

/** Known groups for event providers */
AdobeIOEvents.Groups = {
    MARKETING_CLOUD: "Marketing Cloud",
    DOCUMENT_CLOUD: "Document Cloud",
    CREATIVE_CLOUD: "Creative Cloud",
    EXPERIENCE_PLATFORM: "Experience Platform"
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
