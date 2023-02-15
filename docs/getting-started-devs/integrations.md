---
title: Integration
description: Integrating with Nano
tags: nano, integration, guide, building, development, uri, links, qr
---

# Integration

## URI Scheme Standards

> ⚠️⚠️ `amount` values *MUST* always default to [RAW units](https://docs.nano.org/protocol-design/distribution-and-units/). For the `payto:` scheme, other currencies or units may be manually specified (eg XNO, USD, EUR) using the `currency` option.

> ⚠️ Nano wallet clients should support handling of both URI scheme standards: the universal [`payto:` scheme](#payto-payment-invocation-uri-scheme), as well as the original [`nano:` scheme](#nano-payment-invocation-uri-scheme).

> ⚠️ Deep links for payment invocation should prefer the payto standard and use the format `payto://` rather than `payto:`.

### payto: Payment Invocation URI Scheme

The `payto:` URI scheme, defined in [RFC-8905](https://www.rfc-editor.org/rfc/rfc8905.html) is a universal standard for designating targets for payments.

#### Syntax

`payto:nano/nano_<encoded_address>/[?][amount=[<currency>:]<raw_amount>][&][receiver_name=<recipient_name>][&][message=<message>]`

Clients *MUST* accept URIs with options in any order.

**encoded_address (required)**  
The recipient's [public Nano address](https://docs.nano.org/integration-guides/the-basics/#account-public-address). *MUST* be provided, and *MUST* be encoded using Nano's base32 encoding algorithm.

**currency**  
*MUST* default to `RAW`.  
The 3-letter [ISO-4217](https://en.wikipedia.org/wiki/ISO_4217) currency code (or `RAW` or `XNO`). The client *SHOULD* reference current exchange rates to convert the `amount` value to the currently corresponding amount in [RAW units](https://docs.nano.org/protocol-design/distribution-and-units/). If `XNO` is specified, the client *MUST* convert the `amount` value to `RAW` units.

**amount**  
*MUST* not occur more than once.  
The amount to transfer. If a `currency` value is not provided, the client *MUST* default to [RAW units](https://docs.nano.org/protocol-design/distribution-and-units/). If `XNO` is specified, the client *MUST* convert the value to `RAW` units.

**receiver_name**  
Name of the entity that receives the payment (creditor).  
*Note: The Nano protocol does not support receiver names. The client may choose to use or ignore this option.*

**message**  
A short message to identify the purpose of the payment.  
*Note: The Nano protocol does not support messages. The client may choose to use or ignore this option.*


### nano: Payment Invocation URI Scheme

#### Syntax

`nano:nano_<encoded_address>[?][amount=<raw_amount>][&][label=<label>][&][message=<message>]`

Clients *MUST* accept URIs with options in any order.

**encoded_address (required)**  
The recipient's [public Nano address](https://docs.nano.org/integration-guides/the-basics/#account-public-address). *MUST* be provided, and *MUST* be encoded using Nano's base32 encoding algorithm.

**raw_amount**  
*MUST* not occur more than once.  
The amount to transfer in [RAW units](https://docs.nano.org/protocol-design/distribution-and-units/).

**receiver_name**  
Name of the entity that receives the payment (creditor).  
*Note: The Nano protocol does not support receiver names. The client may choose to use or ignore this option.*

**message**  
A short message to identify the purpose of the payment.  
*Note: The Nano protocol does not support messages. The client may choose to use or ignore this option.*

### Additional nano*: Action Invocation URI Schemes

In addition to payment invocation URI schemes, Nano clients may support the following action invocation URI scheme standards.

#### Representative change

`nanorep:nano_<encoded address>[?][label=<label>][&][message=<message>]`


#### Private key import

`nanokey:<encoded private key>[?][label=<label>][&][message=<message>]`

#### Seed import

`nanoseed:<encoded seed>[?][label=<label>][&][message=<message>][&][lastindex=<index>]`

#### JSON blob block processing

(to be sent as the `block` argument to the RPC call `process`)

`nanoblock:<json>`

### Examples

#### Payment with address only

    (preferred)  
    payto:nano/nano_3wm37qz19zhei7nzscjcopbrbnnachs4p1gnwo5oroi3qonw6inwgoeuufdp
    
    nano:nano_3wm37qz19zhei7nzscjcopbrbnnachs4p1gnwo5oroi3qonw6inwgoeuufdp

#### Payment with address and amount

    (preferred)  
    payto:nano/nano_3wm37qz19zhei7nzscjcopbrbnnachs4p1gnwo5oroi3qonw6inwgoeuufdp?amount=1000

    nano:nano_3wm37qz19zhei7nzscjcopbrbnnachs4p1gnwo5oroi3qonw6inwgoeuufdp?amount=1000

#### Payment with address and recipient name / label

    (preferred)  
    payto:nano/nano_3wm37qz19zhei7nzscjcopbrbnnachs4p1gnwo5oroi3qonw6inwgoeuufdp?receiver-name=Developers%20Fund%20Address

    nano:nano_3wm37qz19zhei7nzscjcopbrbnnachs4p1gnwo5oroi3qonw6inwgoeuufdp?label=Developers%20Fund%20Address

#### Payment with address, recipient name / label, and message

    (preferred)  
    payto:nano/nano_3wm37qz19zhei7nzscjcopbrbnnachs4p1gnwo5oroi3qonw6inwgoeuufdp?receiver-name=Developers%20Fund%20Address&message=Donate%20Now

    nano:nano_3wm37qz19zhei7nzscjcopbrbnnachs4p1gnwo5oroi3qonw6inwgoeuufdp?label=Developers%20Fund%20Address&message=Donate%20Now

#### Payment with address, amount, recipient name / label, and message

    (preferred)  
    payto:nano/nano_3wm37qz19zhei7nzscjcopbrbnnachs4p1gnwo5oroi3qonw6inwgoeuufdp?amount=1000&receiver-name=Developers%20Fund%20Address&message=Donate%20Now

    nano:nano_3wm37qz19zhei7nzscjcopbrbnnachs4p1gnwo5oroi3qonw6inwgoeuufdp?amount=1000&label=Developers%20Fund%20Address&message=Donate%20Now

#### Representative change

    nanorep:nano_1stofnrxuz3cai7ze75o174bpm7scwj9jn3nxsn8ntzg784jf1gzn1jjdkou?label=Official%20Rep%202&message=Thank%20you%20for%20changing%20your%20representative%21


## QR Code Standards

QR codes should also be clickable deep links using the [`payto://` URI scheme](#payto-payment-invocation-uri-scheme), or the corresponding [nano action URI scheme](#additional-nano-action-invocation-uri-schemes).

