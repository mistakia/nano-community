---
title: Privacy policy
description: What nano.community measures about site visitors, what it never stores, and how to opt out
tags: nano, privacy, analytics, site
---

# Privacy policy

nano.community runs its own first-party, cookieless analytics to measure growth and see which pages visitors actually read. This page states exactly what is measured, what is never stored, and how to avoid being counted.

## What is measured

Each page view stores one row containing:

- the path viewed, with Nano addresses replaced by `:account` and block hashes by `:block`
- the day and time, rounded to the request's arrival
- the host a landing visit came from, on the first page view of a visit
- an outreach tag from a `?ref=` link, on the landing page view
- an anonymous hash of the day's key, your IP and your browser, truncated to 16 hex characters — not decodable without the day's key, which is discarded after the day ends
- whether the request carried a valid session (no account is stored)
- whether the browser is an automated bot
- a coarse device class: desktop, mobile or tablet
- on the first page view, the time from navigation start to page load
- client errors, storing only the error message and source

## What is never stored

Never stored anywhere: your raw IP address, your raw browser string, an account id, a device id, a full referrer URL, cookies, or any browser storage. No cookies are set. Nothing is written to your browser.

## Retention

Raw events are kept for 180 days, then deleted. Aggregate daily metrics are kept indefinitely.

## The gap

Visitors with JavaScript off, a blocker that stops the request, a bounce before the load event, or Global Privacy Control turned on are not counted. This site does not add identifying data for them, or for anyone.

## How to opt out

Turn on **Global Privacy Control** in your browser. When the signal is present, no page view or error is sent from this site at all.
