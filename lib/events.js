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

/* eslint-disable dot-notation */

'use strict';

const fetch = require('@adobe/node-fetch-retry');
const jsonwebtoken = require('jsonwebtoken');
const httplinkheader = require('http-link-header');
const { appendQueryParams } = require('./util');
const aioLibEvent = require('@adobe/aio-lib-events');

const CSM_HOST = {
    prod: "https://csm.adobe.io",
    stage: "https://csm-stage.adobe.io"
};
const INGRESS_HOST = {
    prod: "https://eg-ingress.adobe.io",
    stage: "https://eg-ingress-stage.adobe.io"
};
const IO_API_HOST = {
    prod: "https://api.adobe.io",
    stage: "https://api-stage.adobe.io"
};

const DEFAULT_SOCKET_TIMEOUT = 30000;
const DEFAULT_BACKOFF = 2.0;
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
        return parseInt(header, 10) * 1000;
    } else {
        return Date.parse(header) - Date.now();
    }
}

/**
 * Catch all fetch errors that are not returned as errors
 * @param {Object} response fetch responsde
 * @returns {Object} returns either the ok response or an error
 */
function handleFetchErrors(response) {
    if (!response.ok) {
        const error = new Error(`${response.status} ${response.statusText}`);
        error.statusCode = response.status;

        throw error;
    }
    return response;
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
            throw new Error("Must provide options argument with accessToken and orgId");
        }

        let jwt;
        if(!options.clientId || !options.as){ // parse jwt only if info is missing
            jwt = jsonwebtoken.decode(options.accessToken);
        }

        const clientId = options.clientId || (jwt && jwt.client_id);

        this.auth = {
            accessToken: options.accessToken,
            orgId: options.orgId,
            clientId: clientId
        };
        this.defaults = options.defaults;

        const jwtAsContent = options.as || (jwt && jwt.as);
        this.env = jwtAsContent === "ims-na1-stg1" ? "stage" : "prod";
        this.consumerOrgId = options.consumerOrgId;
        this.projectId = options.projectId;
        this.workspaceId = options.workspaceId; 

        // TODO to be used with factory method
        this.aioLibEventClient = options.aioLibEventClient;
    }

    static async createAdobeIOEventsWithAioLib(orgId, clientId, accessToken, httpOptions) {
        const aioLibEventClient = await aioLibEvent.init(orgId, clientId, accessToken, httpOptions);
        return new AdobeIOEvents({orgId, clientId, accessToken, aioLibEventClient});
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
     * @typedef {Object} RetryOptions
     * @property {String} retryIntervalMillis time between retries in milliseconds
     * @property {String} maxSeconds time to retry until throwing an error
     */
    /**
     * Register a new event provider or update an existing one.
     * @param {EventProvider} provider The event provider to register
     * @param {RetryOptions} retryOptions retry options. If set to false, retry functionality will be disabled. If not set, it will use the default times
     * @returns {Promise}
     */
    async registerEventProvider_V2API(provider, retryOptions=true) {
        // const url = `${CSM_HOST[this.env]}/csm/events/provider`;
        const url = `${IO_API_HOST[this.env]}/${this.consumerOrgId}/${this.projectId}/${this.workspaceId}/providers}`;
        const response = await fetch(url,{
            method: 'POST',
            headers: {
                // 'X-Adobe-IO-AEM-Version': '6.4.0',
                // 'X-Adobe-Product': 'AEM',
                'x-ims-org-id': this.auth.orgId,
                'Authorization': `Bearer ${this.auth.accessToken}`,
                'Content-Type': 'application/hal+json'
            },
            body: JSON.stringify({
                provider: provider.id || this.defaults.providerId,
                grouping: provider.grouping,
                label: provider.label,
                provider_metadata: provider.metadata || this.defaults.providerMetadata,
                instance_id: provider.instanceId
            }),
            retryOptions: retryOptions
        });
        return handleFetchErrors(response).json();
    }

    
    async registerEventProvider(provider, retryOptions=true) {
        // api-register does not pass the retry options so it would default to retry by default
        // TODO: handle retry options to api-register
        const httpOptions = {
            timeout: parseInt(process.env.NODE_FETCH_RETRY_SOCKET_TIMEOUT) || DEFAULT_SOCKET_TIMEOUT,
            retries: parseInt(process.env.NODE_FETCH_RETRY_BACKOFF) || DEFAULT_BACKOFF,

        };
        // initialize sdk
        let aioLibEventClient;
        if(!this.aioLibEventClient) {
            aioLibEventClient = await aioLibEvent.init(this.auth.orgId, this.auth.clientId, this.auth.accessToken, httpOptions);
        }

        // call methods
        try {
            const body = {
                label: provider.label,
                description: "Asset Compute Provider",
                // docs_url: "what is docs_url",
                // event_delivery_format: "what is event_delivery_format",
                provider_metadata: provider.metadata || this.defaults.providerMetadata,
                instance_id: provider.instanceId,
                // pipeline_smart_region: "what is pipeline_smart_region",
                // data_residency_region: "what is data_residency_region"
            };
            const result = await aioLibEventClient.createProvider(this.consumerOrgId, this.projectId, this.workspaceId, body);
            console.log(result);
            return result;

        } catch (e) {
            console.error(e);
            if(e.code === 'ERROR_CREATE_PROVIDER' && e.toString().includes('409 - Conflict')){
                console.log(`Event provider for ${this.consumerOrgId}, ${this.projectId}, ${this.workspaceId} already exists`);
                return {
                    exists: true
                };
            } else {
                throw e;
            }
        }
    }

    async getEventProvider(consumer, retryOptions=true) {
        const consumerOrgId = consumer || this.consumerOrgId;

        // api-register does not pass the retry options so it would default to retry by default
        // TODO: handle retry options to api-register
        const httpOptions = {
            timeout: parseInt(process.env.NODE_FETCH_RETRY_SOCKET_TIMEOUT) || DEFAULT_SOCKET_TIMEOUT,
            retries: parseInt(process.env.NODE_FETCH_RETRY_BACKOFF) || DEFAULT_BACKOFF
        };
        // initialize sdk
        const aioLibEventClient = await aioLibEvent.init(this.auth.orgId, this.auth.clientId, this.auth.accessToken, httpOptions);

        // call methods
        try {
            const result = await aioLibEventClient.getAllProviders(consumerOrgId);
            console.log(result);
            const foundProviders = [];
            if(result && result._embedded && result._embedded.providers 
                    && Array.isArray(result._embedded.providers)) {
                const providers = result._embedded.providers;
                console.log('found providers: ', providers);
                
                providers.forEach(provider => {
                    // although provider were found, we must make sure they are asset_compute
                    if (provider.provider_metadata === AdobeIOEvents.Metadata.ASSET_COMPUTE && 
                            provider.instance_id === this.auth.clientId &&
                            provider.publisher === this.auth.orgId) {
                        console.log("Found a provider!", provider.id);
                        foundProviders.push(provider);
                    }
                });
            }
            if(foundProviders.length > 0) {
                console.log(`Event provider for ${consumerOrgId} :`, foundProviders);
            } else {
                console.log(`No event provider found for ${consumerOrgId}`);
            }
            return foundProviders;
        } catch (e) {
            console.error(e);
            console.log(`Error geting event provider for ${consumerOrgId} :`);
            throw e;
        }
    }
    /**
     * Deletes an event provider.
     * @param {String} providerId the id of the event provider to delete
     * @returns {Promise}
     */
    async deleteEventProvider(providerId, retryOptions=true) {
        const url = `${CSM_HOST[this.env]}/csm/events/provider/${providerId}`;
        const response = await fetch(url, {
            method: 'DELETE',
            headers: {
                'x-ims-org-id': this.auth.orgId,
                'Authorization': `Bearer ${this.auth.accessToken}`
            },
            retryOptions: retryOptions
        });
        return handleFetchErrors(response);
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
     * @param {RetryOptions} retryOptions retry options. If set to false, retry functionality will be disabled. If not set, it will use the default times
     * @returns {Promise}
     */
    async registerEventType_OLD(eventType, retryOptions=true) {
        const url =`${CSM_HOST[this.env]}/csm/events/metadata`;
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'x-ims-org-id': this.auth.orgId,
                'Authorization': `Bearer ${this.auth.accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                provider: eventType.provider || this.defaults.providerId,
                event_code: eventType.code,
                label: eventType.label,
                description: eventType.description
            }),
            retryOptions: retryOptions
        });
        return handleFetchErrors(response).json();
    }

    async registerEventType(eventType, retryOptions=true) {
        // api-register does not pass the retry options so it would default to retry by default
        // TODO: handle retry options to api-register
        const httpOptions = {
            timeout: parseInt(process.env.NODE_FETCH_RETRY_SOCKET_TIMEOUT) || DEFAULT_SOCKET_TIMEOUT,
            retries: parseInt(process.env.NODE_FETCH_RETRY_BACKOFF) || DEFAULT_BACKOFF
        };
        // initialize sdk
        const aioLibEventClient = await aioLibEvent.init(this.auth.orgId, this.auth.clientId, this.auth.accessToken, httpOptions);

        // call methods
        try {
            const body = {
                // provider: eventType.provider || this.defaults.providerId,
                event_code: eventType.code,
                label: eventType.label,
                description: eventType.description,
                // sample_event_template: "what is sample_event_template"
            };
            const result = await aioLibEventClient.createEventMetadataForProvider(this.consumerOrgId, 
                this.projectId, this.workspaceId, eventType.providerId, body);
            console.log(result);
            return result;

        } catch (e) {
            console.error(e);
            throw e;
        }
        // return handleFetchErrors(result).json();
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
     * @param {RetryOptions} retryOptions retry options. If set to false, retry functionality will be disabled. If not set, it will use the default times
     * @returns {Promise}
     */
    async sendEvent(event, retryOptions) {
        const url = `${INGRESS_HOST[this.env]}/api/events`;
        const retryOnHttpResponse = (response) => {
            // retry on any 5xx status codes and on 204 (IO events cache issue)
            return (response && (response.status === 204 || response.status >= 500 ));
        };
        if (typeof retryOptions === 'object') {
            if(!retryOptions.retryOnHttpResponse) {
                retryOptions.retryOnHttpResponse = retryOnHttpResponse;
            }
        } else if(retryOptions !== false) {
            retryOptions = {
                retryOnHttpResponse: retryOnHttpResponse
            };
        }

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-ims-org-id': this.auth.orgId,
                'x-api-key': this.auth.clientId,
                'Authorization': `Bearer ${this.auth.accessToken}`
            },
            body: JSON.stringify({
                user_guid: this.auth.orgId,
                provider_id: event.provider || this.defaults.providerId,
                event_code: event.code,
                event: Buffer.from(JSON.stringify(event.payload || {})).toString('base64')
            }),
            retryOptions: retryOptions
        });
        if (response.status !== 200) {
            // If retry is disabled then anything other than 200 is considered an error

            // 204 No Content status should be considered a failure by us.
            // It means that the event was accepted, but there were no registrations interested in
            // the event. In this case it means that the journal has not been fully created yet.
            // The result is that the posted event is lost.
            console.log(`sending event failed with ${response.status} ${response.statusText}`);
            throw Error(`${response.status} ${response.statusText}`);
        }
    }

    /**
     * List event consumer registrations (journals or webhooks) for the given integration (consumer + application id).
     *
     * @property {String} consumerId short organization ID from console.adobe.io (not the IMS org ID), example: 105979
     * @property {String} applicationId integration ID from console.adobe.io, example: 47334
     * @param {RetryOptions} retryOptions retry options. If set to false, retry functionality will be disabled. If not set, it will use the default times
     * @returns {Promise}
     */
    async listConsumerRegistrations_OLD(consumerId, applicationId, retryOptions=true) {
        consumerId = consumerId || this.defaults.consumerId;
        applicationId = applicationId || this.defaults.applicationId;

        const url = `${IO_API_HOST[this.env]}/events/organizations/${consumerId}/integrations/${applicationId}/registrations`;

        const response = await fetch(url,{
            headers: {
                'x-api-key': this.auth.clientId,
                'x-ims-org-id': this.auth.orgId,
                'Authorization': `Bearer ${this.auth.accessToken}`,
                'Content-Type': 'application/json'
            },
            retryOptions: retryOptions
        });
        return handleFetchErrors(response).json();
    }
    
    async listConsumerRegistrations(consumerId, project, workspace, retryOptions=true) {
        const consumerOrgId = consumerId || this.consumerOrgId;
        const projectId = project || this.projectId;
        const workspaceId = workspace || this.workspaceId;
        
        // api-register does not pass the retry options so it would default to retry by default
        // TODO: handle retry options to api-register
        const httpOptions = {
            timeout: parseInt(process.env.NODE_FETCH_RETRY_SOCKET_TIMEOUT) || DEFAULT_SOCKET_TIMEOUT,
            retries: parseInt(process.env.NODE_FETCH_RETRY_BACKOFF) || DEFAULT_BACKOFF
        };
        // initialize sdk
        const aioLibEventClient = await aioLibEvent.init(this.auth.orgId, this.auth.clientId, this.auth.accessToken, httpOptions);

        // call methods
        try {
            const result = await aioLibEventClient.getAllRegistrationsForWorkspace(consumerOrgId,
                projectId, workspaceId);
            console.log(result);
            if(result && result._embedded && result._embedded.registrations) {
                return result._embedded.registrations;
            }

        } catch (e) {
            console.error(e);
            throw e;
        }
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
     * @param {RetryOptions} retryOptions retry options. If set to false, retry functionality will be disabled. If not set, it will use the default times
     * @returns {Promise}
     */
    async createJournal_OLD(journal, retryOptions=true) {
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

        const url =`${IO_API_HOST[this.env]}/events/organizations/${consumerId}/integrations/${applicationId}/registrations`;

        const response = await fetch(url,{
            method: 'POST',
            headers: {
                'x-api-key': this.auth.clientId,
                'x-ims-org-id': this.auth.orgId,
                'Authorization': `Bearer ${this.auth.accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body),
            retryOptions: retryOptions
        });

        return handleFetchErrors(response).json();
    }

    async createJournal(journal, retryOptions=true) {

        // api-register does not pass the retry options so it would default to retry by default
        // TODO: handle retry options to api-register
        const httpOptions = {
            timeout: parseInt(process.env.NODE_FETCH_RETRY_SOCKET_TIMEOUT) || DEFAULT_SOCKET_TIMEOUT,
            retries: parseInt(process.env.NODE_FETCH_RETRY_BACKOFF) || DEFAULT_BACKOFF
        };
        // initialize sdk
        const aioLibEventClient = await aioLibEvent.init(this.auth.orgId, this.auth.clientId, this.auth.accessToken, httpOptions);

        const body =   {
            client_id: this.auth.clientId,
            name: journal.name,
            description: journal.description,
            events_of_interest: [],
            delivery_type: "JOURNAL",
            // runtime_action: "what is runtime_action",
            enabled: true
        };

        for (const t of journal.eventTypes) {
            if (typeof t === 'string') {
                body.events_of_interest.push({
                    // provider: "what is provider",
                    event_code: t,
                    provider_id: journal.providerId || this.defaults.providerId
                });
            } else if (typeof t === 'object') {
                body.events_of_interest.push({
                    // provider: "what is provider",
                    event_code: t.type,
                    provider_id: t.providerId || this.defaults.providerId
                });
            }
        }

        const consumerId = journal.consumerId || this.consumerOrgId || this.defaults.consumerId;
        try {
            const result = await aioLibEventClient.createRegistration(consumerId, journal.projectId, journal.workspaceId, body);
            console.log(result);
            return result;

        } catch (e) {
            console.error(e);
            throw e;
        }
    }

    /**
     * Deletes a journal or webhook registration.
     * @param {String} registrationId the id of the event listener registration to delete
     * @returns {Promise}
     */
    async deleteJournal(registrationId, retryOptions=true) {
        if (process.env.DELETE_JOURNAL_API_KEY === undefined) {
            return Promise.reject("Cannot invoke ioEvents.deleteJournal() because special API key is not set as environment variable: DELETE_JOURNAL_API_KEY");
        }

        const url = `${CSM_HOST[this.env]}/csm/webhooks/${this.auth.clientId}/${registrationId}`;
        const response = await fetch(url, {
            method: 'DELETE',
            headers: {
                'x-ims-org-id': this.auth.orgId,
                'x-api-key': process.env.DELETE_JOURNAL_API_KEY,
                'x-ams-consumer-id': this.defaults.consumerId,
                'x-ams-application-id': this.defaults.applicationId,
                'Authorization': `Bearer ${this.auth.accessToken}`,
                'Content-Type': 'application/json'
            },
            retryOptions: retryOptions
        });
        return handleFetchErrors(response);
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
    async getEventsFromJournal(journalUrl, options) {
        const url = appendQueryParams(journalUrl, options);

        const response = await fetch(url, {
            headers: {
                'x-api-key': this.auth.clientId,
                'x-ims-org-id': this.auth.orgId,
                'Authorization': `Bearer ${this.auth.accessToken}`,
                'Content-Type': 'application/json'
            }, retryOptions: false
        });

        if ((response.status === 200) || (response.status === 204)) {
            const resultBody = await ((response.status === 200)? response.json():{});

            const result = { ...resultBody};
            const linkHeader = response.headers.get("link");
            const retryAfterHeader = response.headers.get("retry-after");
            if (linkHeader) {
                result.link = parseLinkHeader(journalUrl, linkHeader);
            }
            if (retryAfterHeader) {
                result.retryAfter = parseRetryAfterHeader(retryAfterHeader);
            }
            return result;
        } else {
            throw Error(`get journal events failed with ${response.status} ${response.statusText}`);
        }
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
};

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
