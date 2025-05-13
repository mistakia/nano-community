---
title: Integrations
description: Integrating with Nano
tags: nano, integration, guide, building, development, uri, links, qr, identifier, identifiers, nfc
---

# Integrations

##### Table of Contents

- [URI Schemes](#uri-schemes)
- [Payment Verifications](#payment-verifications)
- [Nano Internet Identifiers](#nano-internet-identifiers)
- [QR Codes and NFC Tags](#qr-codes-and-nfc-tags)
- [URI Examples](#uri-examples)

---

## URI Schemes

Nano wallet clients should support handling of two URI scheme standards: the universal [`payto:` scheme](#payto-payment-invocation-uri-scheme), as well as the original [`nano:` scheme](#nano-payment-invocation-uri-scheme).

Deep links for payment invocation should prefer the payto standard and use the format `payto://` rather than `payto:`.

`amount` values MUST always default to [RAW units](https://docs.nano.org/protocol-design/distribution-and-units/).

<small>For the `payto:` scheme, other currencies or units may be manually specified (eg XNO, USD, EUR) using the `currency` option.</small>

See [URI Examples](#uri-examples) for examples.

##### Table of Contents

- [`payto:` URI scheme](#payto-payment-invocation-uri-scheme)
- [`nano:` URI scheme](#nano-payment-invocation-uri-scheme)

---

## payto: Payment Invocation URI Scheme

The `payto:` URI scheme, defined in [RFC-8905](https://www.rfc-editor.org/rfc/rfc8905.html) is a universal standard for designating targets for payments.

See [URI Examples](#uri-examples) for examples.

### Syntax

```
payto:nano/<recipient>[?][amount=[<currency>:]<raw_amount>][&][receiver_name=<receiver_name>][&][message=<message>]
```

<small>Note: Clients MUST accept URIs with options in any order.</small>

#### recipient (required)

MUST be provided.

Can be either the recipient's [Nano internet identifier](#internet-identifiers) or [public Nano address](https://docs.nano.org/integration-guides/the-basics/#account-public-address).

Public nano addresses MUST be encoded using Nano's base32 encoding algorithm and prefixed with `nano_`.

#### currency

The 3-letter [ISO-4217](https://en.wikipedia.org/wiki/ISO_4217) currency code (or `RAW` or `XNO`). The client SHOULD reference current exchange rates to convert the `amount` value to the currently corresponding amount in [RAW units](https://docs.nano.org/protocol-design/distribution-and-units/). If `XNO` is specified, the client MUST convert the `amount` value to `RAW` units.

<small>MUST default to `RAW`</small>

#### amount

The amount to transfer. If a `currency` value is not provided, the client MUST default to [RAW units](https://docs.nano.org/protocol-design/distribution-and-units/). If `XNO` is specified, the client MUST convert the value to `RAW` units.

<small>MUST not occur more than once.</small>

#### receiver_name

Name of the entity that receives the payment (creditor).

<small>Note: The Nano protocol does not support receiver names. The client may choose to use or ignore this option.</small>

#### message

A short message to identify the purpose of the payment.

<small>Note: The Nano protocol does not support messages. The client may choose to use or ignore this option.</small>

---

## nano: Payment Invocation URI Scheme

The `nano:` URI scheme is the [original scheme](https://docs.nano.org/integration-guides/the-basics/#uri-and-qr-code-standards) defined for Nano URIs.

It is now recommended to use the [payto: URI scheme](#payto-payment-invocation-uri-scheme) for payment invocations and confirmations. For other purposes, the [nano\*: action URI schemes](#additional-nano-action-invocation-uri-schemes) should be used.

See [URI Examples](#uri-examples) for examples.

### Syntax

```
nano:<recipient>[?][amount=<raw_amount>][&][label=<label>][&][message=<message>]
```

<small>Note: Clients MUST accept URIs with options in any order.</small>

#### recipient (required)

MUST be provided.

Can be either the recipient's [Nano internet identifier](#internet-identifiers) or [public Nano address](https://docs.nano.org/integration-guides/the-basics/#account-public-address).

Public nano addresses MUST be encoded using Nano's base32 encoding algorithm and prefixed with `nano_`.

#### amount

MUST not occur more than once.
The amount to transfer in [RAW units](https://docs.nano.org/protocol-design/distribution-and-units/).

#### label

A short label to identify or organize the transaction.

<small>Note: The Nano protocol does not support receiver names. The client may choose to use or ignore this option.</small>

#### message

A short message for the transaction recipient.

<small>Note: The Nano protocol does not support messages. The client may choose to use or ignore this option.</small>

### Additional nano\*: URI Schemes

In addition to payment invocation URI schemes, Nano clients may support the following URI scheme standards.

#### Nano block verification

```
nanoverify:<block hash>
```

<small>Note: The `nanoverify:` URI scheme is a new proposal that is not currently specified in the Nano Foundation documentation for the `nano:` URI schemes.</small>

#### Representative change

```
nanorep:nano_<encoded address>[?][label=<label>][&][message=<message>]
```

#### Private key import

```
nanokey:<encoded private key>[?][label=<label>][&][message=<message>]
```

#### Seed import

```
nanoseed:<encoded seed>[?][label=<label>][&][message=<message>][&][lastindex=<index>]
```

#### JSON blob block processing

Sent as the `block` argument to the RPC call [`process`](https://docs.nano.org/commands/rpc-protocol/#process)

```
nanoblock:<json>
```

---

## Payment Verifications

Upon confirming that a transaction has been successfully processed by the Nano network, Nano wallet clients SHOULD allow the user to provide the merchant wallet with the resulting block hash for the confirmed send block.

This should be done using the [nanoverify: URI scheme](#nano-block-verification) identifying the resulting block hash, such as `nanoverify:991CF190094C00F0B68E2E5F75F6BEE95A2E0BD93CEAA4A6734DB9F19B728948`

<small>Note: The `nanoverify:` URI scheme is a new proposal that is not currently specified in the Nano Foundation documentation for the `nano:` URI schemes.</small>

This could be done in various ways, such as generating a QR code, using an NFC tag, or copying and pasting the resulting `nanoverify:` URI.

Once the merchant wallet has received the `nanoverify:` URI from the customer through one of these methods, it can verify the payment address and amount using a `block_info` RPC request, and consider the payment completed.

This process can be referred to as "2-Tap" Payment Confirmation.

## Nano Internet Identifiers

For convenience, users may prefer to use internet identifiers as an alternative to public addresses when specifying send or receive targets.

For this reason, it is preferable for Nano wallet clients to support handling of Nano internet identifiers in addition to Nano public addresses. 

An internet identifier, defined in [RFC-5322 Section 3.4.1](https://datatracker.ietf.org/doc/html/rfc5322#section-3.4.1) as an `"addr-spec"`, is an email address-like identifier that contains a locally interpreted string, the `<local-part>`, followed by the at-sign character ("@"), followed by an Internet domain, the `<domain>`. To avoid confusion with email addresses, it is recommended that services that support Nano Internet Identifiers use the at-sign as a prefix for both the `<local-part>` and the `<domain>`, resulting in `@<local-part>@<doman>`.

##### Table of Contents

- [Nano Identifier Services](#nano-identifier-services)
- [Client Use of Nano Identifiers](#client-use-of-nano-identifiers)

### Nano Identifier Services

##### Table of Contents
- [.well-known/nano-currency.json endpoint](#well-knownnano-currencyjson-endpoint)
- [Request and response formats](#request-and-response-formats)
- [Serving from a subdomain](#serving-from-a-subdomain)
- [Static self-hosting](#static-self-hosting)
- [Allowing access from JavaScript clients](#allowing-access-from-javascript-clients)
- [Security constraints](#security-constraints)
- [Re-assignment of Nano identifiers](#re-assignment-of-nano-identifiers)

#### .well-known/nano-currency.json endpoint

Nano identifier services MUST accept and respond to requests made to the endpoint `<domain>/.well-known/nano-currency.json`.

##### Request schema
```
<domain>/.well-known/nano-currency.json?names=<local-part>,<local-part>,...
```

##### names

A comma-delimited list of `local-part` (identifiers) to search for.

Nano identifier services MUST treat each `local-part` as case-insensitive. 

On record creation, Nano identifier services MAY choose to store the `local-part` with user-specified casing for display purposes.

<small>For example, a record for `johndoe` should be returned for all requests for `JohnDoe`, `JOHNDOE`, etc</small>

##### Response schema
Nano identifier services MUST respond to requests with a JSON document response in the format of

```json
{
    "names": [
        {
            "name": "<local-part>",
            "address": "<nano-address>",
            "expiry": "<name-expiry>",
            ...
        },
        ...
    ]
}
```

###### names

MUST be included in responses.

A list of all matching records for all `local-part` values included in the `names` query parameter of the request.

If no matching records are found for any of the `local-part` values, an empty list should be returned.

###### name (required)

MUST be included in each matching record returned in the `names` list.

The `local-part` value for the matching record.

###### address (required)

MUST be included in each matching record returned in the `names` list.

The Nano address (prefixed with `nano_`) for the matching record.

###### expiry

MAY be included in each matching record returned in the `names` list.

The expiration date/time for the matching record in ISO 8601 UTC format (e.g. `yyyy-mm-ddThh:MM:SSZ`).


#### Request and response formats

The `.well-known` directory, defined in [RFC-8615](https://datatracker.ietf.org/doc/html/rfc8615), is a standardized directory in the root of a website that serves as a location for storing files that specify how clients and other services should interact with the site or web application. This is an ideal path from which to serve Nano identifier mappings.

By using the `nano-currency.json` file path and a query list instead of a path parameter to specify `<local-part>`, the protocol can support both dynamic services that can generate JSON on-demand and static servers with a JSON file that may contain multiple names. A static file server will simply ignore the query parameters and return the entire file.

Allowing comma-separated values to be provided for the `names` query parameter, and responding with a list structured `names` field also allows clients to make requests for multiple Nano identifier names in a single request.

#### Serving from a subdomain

If a Nano identifier service prefers to serve from a subdomain (eg. `nano.example.com`) rather than the root domain (eg `example.com`), they may define a [DNS SRV record](https://en.wikipedia.org/wiki/SRV_record) to specify the subdomain and port used for serving Nano identifiers with a `_nano_currency._tcp.<doman>` SRV record.

The client, upon receiving an error when sending a request to `<domain>/.well-known/nano-currency.json?names=<local-part>`, may resolve the DNS SRV record `_nano_currency._tcp.<domain>` to determine which subdomain (and port) to send requests to. The client may also do this lookup preemptively if preferred.

An example of a DNS SRV record for the subdomain `nano.example.com` using the default port of 443.

```dns
_nano_currency._tcp.example.com 86400 IN SRV 0 0 443 nano.example.com
```

#### Static self-hosting

Users may choose to host their own Nano identifiers through a static file server.

This may be done in the same way as a public static file server, by hosting the file `.well-known/nano-currency.json` from the root of the static file server, in the same format as described above, such as

```json
{
    "names": [
        {
            "name": "user",
            "address": "nano_3wm37qz19zhei7nzscjcopbrbnnachs4p1gnwo5oroi3qonw6inwgoeuufdp",
            "expiry": null
        },
    ]
}
```

#### Allowing access from JavaScript clients

JavaScript Nano clients may be restricted by browser [CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS) policies that prevent them from accessing `/.well-known/nano-currency.json` on the user's domain. 

When CORS prevents JS from loading a resource, the JS program sees it as a network failure identical to the resource not existing, so it is not possible for a pure-JS app to tell the user for certain that the failure was caused by a CORS issue. 

JavaScript Nano clients that see network failures requesting `/.well-known/nano-currency.json` files may want to recommend to users that they check the CORS policy of their servers, e.g.:

```
$ curl -sI https://example.com/.well-known/nano-currency.json?names=user | grep -i ^Access-Control
Access-Control-Allow-Origin: *
```

Services should ensure that their `/.well-known/nano-currency.json` is served with the HTTP header `Access-Control-Allow-Origin: *` to ensure it can be validated by pure JS clients running in modern browsers.

#### Security constraints
The `/.well-known/nano-currency.json` endpoint MUST NOT return any HTTP redirects.

Clients MUST ignore any HTTP redirects given by the `/.well-known/nano-currency.json` endpoint.

#### Re-assignment of Nano identifiers

Nano identifier services SHOULD ONLY allow re-assignment of currently or previously registered identifiers to the current or original owner, even in the case of an expired registration. 

For example, a Nano identifier service MAY allow the original owner of an expired registered identifier to re-register the identifier to the original or a new Nano public address by requiring authentication with the originally assigned address or an alternative authentication method.

This restriction ensures that a new user cannot claim an expired identifier and receive payments that were intended for the original owner.

### Client Use of Nano Identifiers

Upon encountering a Nano identifier in the format `@<local-part>@<domain>`, the client SHOULD perform an address lookup by sending a GET request to the endpoint `<domain>/.well-known/nano-currency.json?names=<local-part>`.

If an error is received, the client SHOULD attempt to resolve a DNS SRV record for the service with the name `_nano_curency_names._tcp.<domain>`, and retry with the resolved subdomain and port. If preferred, the client MAY preemptively do this resolution prior to the initial request.

The client should receive a response with a status code of `200 OK` and a JSON document in the format of 

```json
{
    "names": [
        {
            "name": "<local-part>",
            "address": "<nano-address>",
            "expiry": "<name-expiry>",
            ...
        },
        ...
    ]
}
```

The client should search the JSON document response for item(s) in the `"names"` list with the relevant names.

Clients SHOULD store and reference only Nano addresses, not Nano identifiers.

This ensures that in the case of an expired or re-assigned Nano identifier, payments are not accidentally sent to the wrong address.

## QR Codes and NFC Tags

QR codes and NFC tags SHOULD use deep links with the [`payto://` URI scheme](#payto-payment-invocation-uri-scheme), or the corresponding [nano action URI scheme](#additional-nano-action-invocation-uri-schemes).

QR codes SHOULD also be clickable links to allow invocation directly on the rendering device.

## URI Examples

### Payment with address only

#### payto: <small>(recommended)</small>

```
payto:nano/nano_3wm37qz19zhei7nzscjcopbrbnnachs4p1gnwo5oroi3qonw6inwgoeuufdp
```

#### nano:

```
nano:nano_3wm37qz19zhei7nzscjcopbrbnnachs4p1gnwo5oroi3qonw6inwgoeuufdp
```

---

### Payment with Nano identifier only

#### payto: <small>(recommended)</small>

```
payto:nano/@nanouser@example.com
```

#### nano:

```
nano:@nanouser@example.com
```

---

### Payment with address and amount

#### payto: <small>(recommended)</small>

```
payto:nano/nano_3wm37qz19zhei7nzscjcopbrbnnachs4p1gnwo5oroi3qonw6inwgoeuufdp?amount=1000
```

#### nano:

```
nano:nano_3wm37qz19zhei7nzscjcopbrbnnachs4p1gnwo5oroi3qonw6inwgoeuufdp?amount=1000
```

---

### Payment with Nano identifier and amount

#### payto: <small>(recommended)</small>

```
payto:nano/@nanouser@example.com?amount=1000
```

#### nano:

```
nano:@nanouser@example.com?amount=1000
```

---

### Payment with address and recipient name / label

#### payto: <small>(recommended)</small>

```
payto:nano/nano_3wm37qz19zhei7nzscjcopbrbnnachs4p1gnwo5oroi3qonw6inwgoeuufdp?receiver-name=Developers%20Fund%20Address
```

#### nano:

```
nano:nano_3wm37qz19zhei7nzscjcopbrbnnachs4p1gnwo5oroi3qonw6inwgoeuufdp?label=Developers%20Fund%20Address
```

---

### Payment with address, recipient name / label, and message

#### payto: <small>(recommended)</small>

```
payto:nano/nano_3wm37qz19zhei7nzscjcopbrbnnachs4p1gnwo5oroi3qonw6inwgoeuufdp?receiver-name=Developers%20Fund%20Address&message=Donate%20Now
```

#### nano:

```
nano:nano_3wm37qz19zhei7nzscjcopbrbnnachs4p1gnwo5oroi3qonw6inwgoeuufdp?label=Developers%20Fund%20Address&message=Donate%20Now
```

---

### Payment with Nano identifier, amount, recipient name / label, and message

#### payto: <small>(recommended)</small>

```
payto:nano/@nanouser@example.com?amount=1000&receiver-name=Developers%20Fund%20Address&message=Donate%20Now
```

#### nano:

```
nano:@nanouser@example.com?amount=1000&label=Developers%20Fund%20Address&message=Donate%20Now
```

---

### Payment verification

#### nano:

```
nanoverify:991CF190094C00F0B68E2E5F75F6BEE95A2E0BD93CEAA4A6734DB9F19B728948
```

<small>Note: The `nanoverify:` URI scheme is a new proposal that is not currently specified in the Nano Foundation documentation for the `nano:` URI schemes.</small>

---

### Representative change

#### nano:

```
nanorep:nano_1stofnrxuz3cai7ze75o174bpm7scwj9jn3nxsn8ntzg784jf1gzn1jjdkou?label=Official%20Rep%202&message=Thank%20you%20for%20changing%20your%20representative%21
```

---
