<!--- when a new release happens, the VERSION and URL in the badge have to be manually updated because it's a private registry --->
[![npm version](https://img.shields.io/badge/%40nui%2Fadobe--io--events--client-1.3.0-blue.svg)](https://artifactory.corp.adobe.com/artifactory/npm-nui-release/@nui/adobe-io-events-client/-/@nui/adobe-io-events-client-1.3.0.tgz)

Adobe I/O Events Javascript Client
==================================

A simple Javascript/NodeJS client for using [Adobe I/O Events](https://www.adobe.io/apis/cloudplatform/events/documentation.html).

Installation
------------

```
npm install @nui/adobe-io-events-client
```

Usage
-----

### Sending an event

```javascript
const { AdobeIOEvents } = require('@nui/adobe-io-events-client');

// setup using necessary credentials
const ioEvents = new AdobeIOEvents({
    // access token from an integration/technical account with I/O Events entitlement
    accessToken: "ey...",
    // organization sending/receiving events
    orgId: "6EEF12345678901234567890@AdobeOrg",
    
    defaults: {
        providerId: "my_event_provider_id"
    }
});

// send an event
return ioEvents.sendEvent({
    code: "my_event_type",
    payload: {
        hello: "world",
        date: new Date()
    }
});

```

### Receiving events

```javascript
const { AdobeIOEvents, AdobeIOEventEmitter } = require('@nui/adobe-io-events-client');

// setup using necessary credentials
const ioEvents = new AdobeIOEvents({
    // access token from an integration/technical account with I/O Events entitlement
    accessToken: "ey...",
});

// receiving events
const ioEventEmitter = new AdobeIOEventEmitter(ioEvents, 'http://journal-url');
ioEventEmitter.on('event', (event) => {
    // handle event
})
ioEventEmitter.on('error', (error) => {
    // report error
})
```

Journal v2
----------

The Journal v2 API is an incompatible change that impacts all clients. We have documented our client implementation and a few notes on the REST API in [Journal V2 Data flow and REST API](docs/journalv2.md).

APIs used
---------

I/O Events
* [Public documentation](https://www.adobe.io/apis/cloudplatform/events/documentation.html)

I/O Events CSM (Channel Subscription Management) API
* [Swagger API docs](https://git.corp.adobe.com/pages/adobeio/channel-subscription-management/)
* [CSM in API gateway directory (stage)](https://admin-stage.adobe.io/publisher/directory/461/services/692)
* [Source code](https://git.corp.adobe.com/adobeio/channel-subscription-management) - [HTTP endpoint CSMResource.java](https://git.corp.adobe.com/adobeio/channel-subscription-management/blob/master/src/main/java/com/adobe/csm/resource/CSMResource.java)
* [Wiki page with some info](https://wiki.corp.adobe.com/pages/viewpage.action?pageId=1313757010)

Event ingress (send events) API
* [Swagger API docs](https://git.corp.adobe.com/pages/adobeio/channel-subscription-management/?url=https://eg-ingress-stage.adobe.io/swagger.json?api_key=adobe_io_events_swagger)

Console API
* [Swagger API docs](https://git.corp.adobe.com/pages/adobe-apis/api-mgmt-docs/)


Integration YAML
----------------

We designed a fully self-contained YAML file describing an Adobe I/O Integration which can be used by applications and CLIs. This YAML also includes the necessary credentials (private key and client secret) to act on behalf of the technical account of the integration.

### Generate YAML using bookmarklet

You can get the file easily using a handy bookmarklet. Please find it here:

https://git.corp.adobe.com/pages/nui/adobe-io-events-client/

(Bookmarklets aka javascript links cannot be added to github READMEs)

Then follow these steps:

1. go to <https://console.adobe.io/integrations>
2. select the right organization from the drop-down
3. click the desired integration
4. click the bookmark in your browser
5. it will ask for the private key that you used to create the integration, paste it in
6. it will show you the file ready to copy and paste and save with a text editor

To enhance the bookmarklet, find the [source here](bookmarklet/get-integration-yaml-bookmarklet.js) and a tool such as <http://bookmarklets.org/maker/> can be used to generate the bookmarklet link.

### Manually create YAML

Alternatively, you can manually create the file, as per the example below. Include the technical account info from the integration, the public and private keys you created for this integration, the metascopes for the services the integration is subscribed to and the `consumerId` and `applicationId` taken from the console.adobe.io URL: `https://console.adobe.io/integrations/{consumerId}/{applicationId}/overview`.

YAML template:

```
consumerId:    123456
applicationId: 99999
metascopes:
  - event_receiver_api
  - ent_adobeio_sdk

technicalAccount:
  id:           053530dxxxxxxxxxxxxxxxxx@techacct.adobe.com
  org:          6EEF747xxxxxxxxxxxxxxxxx@AdobeOrg
  clientId:     1401f9dxxxxxxxxxxxxxxxxxxxxxxxxx
  clientSecret: d34081fc-xxxx-xxxx-xxxx-xxxxxxxxxxxx
  publicKey: |
    -----BEGIN CERTIFICATE-----
    abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijkl
    mnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwx
    ....
    -----END CERTIFICATE-----
  privateKey: |
    -----BEGIN PRIVATE KEY-----
    abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijkl
    mnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwx
    ....
    -----END PRIVATE KEY-----
```

