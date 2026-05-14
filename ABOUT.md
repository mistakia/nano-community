---
title: nano-community Repository Graph Entry
type: text
description: >-
  Graph entry point for nano-community (nano.community site), mapping it to sibling nano repos, the
  nano-cryptocurrency task umbrella, and nano domain text docs.
base_uri: user:repository/active/nano-community/ABOUT.md
created_at: '2026-05-13T18:06:28.336Z'
entity_id: 379b9ac6-c208-4305-8b0d-ce818474d761
public_read: false
relations:
  - follows [[user:guideline/directory-markdown-standards.md]]
tags:
  - user:tag/nano-community-project.md
  - user:tag/nano-cryptocurrency.md
updated_at: '2026-05-13T18:06:28.336Z'
user_public_key: 10ba842b1307fd60475b887df61ccc7e697970a2d222e7cbf011e51f5de3349b
---

## Purpose

Codebase for [nano.community](https://nano.community) — community-driven documentation, representative monitoring, and stats aggregation for the nano cryptocurrency protocol.

For public overview, see [[README.md]]. For agent-facing build, architecture, and conventions, see [[CLAUDE.md]].

## Context

Part of the nano cryptocurrency ecosystem maintained in this user-base. Sibling repos provide the protocol implementation (`nano-node-light`), ledger data tooling (`nanodb`), and the underlying crypto primitives (`ed25519-blake2b`).

## Notable Context

**Tags**:

- [[user:tag/nano-community-project.md]] — entities for this project
- [[user:tag/nano-cryptocurrency.md]] — broader nano domain

**Task directory**: [[user:task/nano-cryptocurrency/]] — umbrella tasks for the nano ecosystem (with subtasks for nano-community, nanodb, etc.).

**Sibling repositories**:

- [[user:repository/active/nano-node-light/ABOUT.md]] — lightweight nano protocol implementation
- [[user:repository/active/nanodb/ABOUT.md]] — nano ledger data tooling
- [[user:repository/active/ed25519-blake2b/ABOUT.md]] — crypto bindings used across the ecosystem

**Text directory**: [[user:text/nano-cryptocurrency/]] — nano domain knowledge.

**Governing guidelines**:

- [[user:guideline/directory-markdown-standards.md]] — structure for this file

## Scope

**Belongs in this repo**: site code, API, content pages under `docs/`, monitoring and stats aggregation, schema migrations.

**Belongs elsewhere**:

- Protocol implementation → `nano-node-light/`
- Ledger data extraction and formats → `nanodb/`
- Crypto primitives → `ed25519-blake2b/`
- Open work → `task/nano-cryptocurrency/`
