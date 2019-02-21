# Journal V2 Data flow and REST API

## References

* [Journaling With S3](https://wiki.corp.adobe.com/x/P_OfWQ)
* [Journaling 2.0 - Internals](https://wiki.corp.adobe.com/pages/worddav/preview.action?fileName=Journaling+2.0+-+Internals.pptx&pageId=1503650623)

## Consumption Logic

![Adobe I/O Event Journal Flow](adobeio-journal-v2.png)

## REST API

### Retrieve events from journal

`GET ${journalUrl}`

The `journalUrl` is returned when the journal is created.

#### Request

Headers:

| Name          | Type   | Description |
| ------------- | ------ | ----------- |
| x-api-key     | string | Client ID from the JWT access token (required) |
| x-ims-org-id  | string | The IMS organization ID of the tenant (required) |
| Authorization | string | JWT _Bearer_ access token (required) |
| Accept        | string | `application/vnd.adobecloud.events+json` - enables Journal v2 API (required) |

Query string:

| Name          | Type    | Description |
| ------------- | ------- | ----------- |
| latest        | boolean | True to get the latest events, returns typically a _204 status_ with a link to the absolute latest position or a _200 status_ with the events that just became available (optional) |
| seek          | ISO8601 format | Duration measured from now, e.g. -PT10M  (optional) |
| since         | string  | Events newer than position. Note that not all positions can be used, it's recommended to only use the `next` link from a previous request (optional) |
| limit         | number  | maximum number of events (optional, recommended to use default) |

The API will not be able to `seek` the journal position exactly, it will return the oldest closest position to the sought position.

#### Response

Status:

* 200 (OK) - Events found in journal
* 204 (No Content) - Returned in 3 cases:
  * when events newer than the specified position do no exist yet
  * the events did exist in the past but are no longer available (have been purged)
  * the position actually never existed in the journal

Headers:

| Name          | Type   | Description |
| ------------- | ------ | ----------- |
| Content-Type  | string | (200 status) `application/json` |
| Link          | <https://tools.ietf.org/html/rfc5988#section-5> | Link to resources described below |
| Retry-After   | <https://tools.ietf.org/html/rfc7231#section-7.1.3> | (204 status only) indicates when to issue `next` link |

Links:

The _Link header_ contains relative URIs which needs to be resolved with `journalUrl`.

| Name     | Description |
| -------- | -----------
| next     | URI relative to host of `journalUrl`. The URI has the `since` parameter the contains a the position to start from and retains the `limit` property from the requested URL. The client is expected to continue fetching the latest events using `next` link. (204 status only) Same URI as the requested URL. |
| validate | (204 status only) URI relative to host of `journalUrl`. Used to check if the requested URL is pointing to a valid position. |

Body:

* JSON response with an `events` array containing the I/O events from the journal

### Validate position url

`GET ${validateUrl}`

Typically used to validate a previously stored `next` link, e.g. after the client restarted. This is to ensure that the position is still valid and has not been purged.

The `validateUrl` is returned in the _Link header_ with a 204 No Content status when requesting events from the journal.

#### Request

Headers:

| Name          | Type   | Description |
| ------------- | ------ | ----------- |
| x-api-key     | string | Client ID from the JWT access token (required) |
| x-ims-org-id  | string | The IMS organization ID of the tenant (required) |
| Authorization | string | JWT _Bearer_ access token (required) |

#### Response

Status:

* 200 (OK) - The `validateUrl` is valid
* 400 (Bad Request) - The `validateUrl` is not valid because the referenced position has been purged. Restart polling from `journalUrl`.
