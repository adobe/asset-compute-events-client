# ⚠️ DISCLAIMER ⚠️

Test CI
2
3

This is an internal project. It is only meant to be used by [asset-compute-commons](https://github.com/adobe/asset-compute-commons/blob/master/package.json#L12).

For Adobe App Builder applications and other components needing to use I/O Events, please use the [aio-lib-events](https://github.com/adobe/aio-lib-events) library.

---

Adobe Asset Compute I/O Events Javascript Client
==================================

[![Version](https://img.shields.io/npm/v/@adobe/asset-compute-events-client.svg)](https://npmjs.org/package/@adobe/asset-compute-events-client)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](http://www.apache.org/licenses/LICENSE-2.0)
[![Travis](https://travis-ci.com/adobe/asset-compute-events-client.svg?branch=master)](https://travis-ci.com/adobe/asset-compute-events-client)

This is an internal library of the Adobe Asset Compute SDK.
A simple Javascript/NodeJS client for using [Adobe I/O Events](https://www.adobe.io/apis/cloudplatform/events/documentation.html).

Installation
------------

```
npm install @adobe/asset-compute-events-client
```

Usage
-----

### Sending an event

```javascript
const { AdobeIOEvents } = require('@adobe/asset-compute-events-client');

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
const { AdobeIOEvents, AdobeIOEventEmitter } = require('@adobe/asset-compute-events-client');

// setup using necessary credentials
const ioEvents = new AdobeIOEvents({
    // access token from an integration/technical account with I/O Events entitlement
    accessToken: "access...",
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

### Links
IO Events API: https://www.adobe.io/apis/experienceplatform/events/ioeventsapi.html

### Contributing
Contributions are welcomed! Read the [Contributing Guide](./.github/CONTRIBUTING.md) for more information.

### Licensing
This project is licensed under the Apache V2 License. See [LICENSE](LICENSE) for more information.
