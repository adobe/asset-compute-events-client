<!--- when a new release happens, the VERSION and URL in the badge have to be manually updated because it's a private registry --->
[![npm version](https://img.shields.io/badge/%40adobe--internal--nui%2Fadobe--io--events--client-0.0.1-blue.svg)](https://artifactory.corp.adobe.com/artifactory/npm-nui-release/@adobe-internal-nui/adobe-io-events-client/-/@adobe-internal-nui/adobe-io-events-client-0.0.1.tgz)

Adobe I/O Events Javascript Client
==================================

A simple Javascript/NodeJS client for using [Adobe I/O Events](https://www.adobe.io/apis/cloudplatform/events/documentation.html).

Installation
------------

```
npm install @adobe-internal-nui/adobe-io-events-client
```

Usage
-----

```javascript
const AdobeIOEventsClient = require('@adobe-internal-nui/adobe-io-events-client');

// setup using necessary credentials
const ioEvents = new AdobeIOEventsClient({
    // access token from an integration/technical account with I/O Events entitlement
    accessToken: "ey...",
    // organization sending/receiving events
    orgId: "6EEF12345678901234567890@AdobeOrg"
});

// send an event
return ioEvents.sendEvent({
    provider: "my_event_provider_id",
    code: "my_event_type",
    payload: {
        hello: "world",
        date: new Date()
    }
});

```

