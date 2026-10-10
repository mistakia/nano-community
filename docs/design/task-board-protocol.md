---
title: Task Board Protocol
description: Nostr event protocol for the Nano community task board
tags: roadmap, tasks, nostr, nip-34, community, protocol
---

# Task Board Protocol

The Nano community task board is a set of signed [nostr](https://github.com/nostr-protocol/nips) events held on several relays. Any client that follows this document can read and write the board. [nano.community/roadmap](https://nano.community/roadmap) is one such client. Nothing on the board depends on nano.community, GitHub or any single relay.

The board reuses existing NIPs wherever one fits:

| Concern              | Event                       | Kind        | NIP    |
| -------------------- | --------------------------- | ----------- | ------ |
| Board                | Repository announcement     | 30617       | NIP-34 |
| Task                 | Issue                       | 1621        | NIP-34 |
| Lifecycle            | Status                      | 1630 - 1633 | NIP-34 |
| Priority and state   | Label                       | 1985        | NIP-32 |
| Discussion           | Comment                     | 1111        | NIP-22 |
| Trusted contributors | Follow set                  | 30000       | NIP-51 |
| Retraction           | Deletion request            | 5           | NIP-09 |
| Claim                | Task claim (this document)  | 30634       | -      |
| Pledge               | Task pledge (this document) | 30635       | -      |
| Nano account binding | External identity           | 10011       | NIP-39 |

Kinds 30634 and 30635 are defined here. Both are addressable, so a newer event from the same pubkey with the same `d` replaces an older one.

## Board

A board is one kind 30617 repository announcement signed by the **board-owner key**. The board address is `30617:<owner-pubkey>:<d>`. The Nano community board uses `d` = `nano-community-tasks`.

The live Nano community board:

| Field         | Value                                                                                         |
| ------------- | --------------------------------------------------------------------------------------------- |
| Owner npub    | `npub1vjdpn5rkn93slgqn63njkuj5aec870uyjzmmwquezf4tnwzpd2yqvtatxh`                             |
| Owner pubkey  | `649a19d07699630fa013d4672b7254ee707f3f8490b7b70399126ab9b8416a88`                            |
| Board address | `30617:649a19d07699630fa013d4672b7254ee707f3f8490b7b70399126ab9b8416a88:nano-community-tasks` |
| Relay         | `wss://relay.nano.community`                                                                  |

Read the stewards and the relay set from the latest announcement at that address, not from this table.

| Tag           | Meaning                                  |
| ------------- | ---------------------------------------- |
| `d`           | Board identifier, `nano-community-tasks` |
| `name`        | Display name                             |
| `description` | One-line description                     |
| `web`         | One per client location (see Clients)    |
| `relays`      | The default relay set                    |
| `maintainers` | Steward pubkeys                          |
| `t`           | Optional topics                          |

The board carries no `clone` tag. It spans more than one code repository, and NIP-34 clients (gitworkshop.dev, ngit) render a board without one.

```json
{
  "kind": 30617,
  "created_at": 1767225600,
  "tags": [
    ["d", "nano-community-tasks"],
    ["name", "Nano community tasks"],
    ["description", "Community task board for the Nano ecosystem."],
    ["web", "https://nano.community/roadmap"],
    ["relays", "wss://relay.nano.community"],
    [
      "maintainers",
      "5f64993ccb4044a005e82ba07e78b2815a6a17aa7d5ad62fd59d519778072483"
    ],
    ["t", "nano"]
  ],
  "content": "",
  "pubkey": "99c2aa85d2b21a62f396907a802a58e521dafd5bddaccbd72786eea189bc4dc9",
  "id": "228ccb91d6a15f412af04ed8a739626d2bf5c0261fd51b9f53a656aa1aa34938",
  "sig": "c62fb3c7961ed575a01d2b1ec0bcde613dbf8a9a6c2c4b2b960bb2631f25712a12076879b3e58c1f36e8b63c9447067cdb7d10d3b32508ab57521de93d9d5817"
}
```

### Keys and stewards

- The **board-owner key** is cold. It is held offline and signs only announcements. It is the root of steward authority.
- **Stewards** are the owner plus every pubkey in the `maintainers` tag of the owner's latest announcement (latest `created_at`, ties to the lowest id). Older announcements are ignored.
- Adding, removing or rotating a steward is a new announcement from the owner key. A compromised steward key is removed the same way.
- One steward key is held by the operator's automation, which publishes the operator's public task list hourly.

## Task

A task is a NIP-34 issue (kind 1621). Anyone may file one.

| Tag              | Meaning                                                          |
| ---------------- | ---------------------------------------------------------------- |
| `a`              | The board address                                                |
| `p`              | The board owner                                                  |
| `subject`        | Title                                                            |
| `t`              | Optional topics                                                  |
| `base_entity_id` | Optional. Set on tasks published from the operator's task system |
| `e` `supersedes` | Optional. `["e", <old-issue-id>, "", "supersedes"]` on a reissue |

Content is plaintext markdown.

```json
{
  "kind": 1621,
  "created_at": 1767225660,
  "tags": [
    [
      "a",
      "30617:99c2aa85d2b21a62f396907a802a58e521dafd5bddaccbd72786eea189bc4dc9:nano-community-tasks"
    ],
    ["p", "99c2aa85d2b21a62f396907a802a58e521dafd5bddaccbd72786eea189bc4dc9"],
    ["subject", "Document representative uptime scoring"],
    ["t", "docs"],
    ["base_entity_id", "6f1c3a52-0b7e-4c1e-9a55-3a9e2f0d1b44"]
  ],
  "content": "Explain how uptime scores are computed on the representatives page.",
  "pubkey": "5f64993ccb4044a005e82ba07e78b2815a6a17aa7d5ad62fd59d519778072483",
  "id": "5c27f254991224199cfeaa398b2a1c2e1b6fae5efe79cdbc0662f61ee92aa012",
  "sig": "9468fc8bee1cc733a37843e414182f5b32cfd1209a023ecb88a1ed68b17ef1479540fbde999d81f0b1df71059948ba26455e5904f37c806c862bdbc57cbea6e4"
}
```

A trusted contributor's issue:

```json
{
  "kind": 1621,
  "created_at": 1767225800,
  "tags": [
    [
      "a",
      "30617:99c2aa85d2b21a62f396907a802a58e521dafd5bddaccbd72786eea189bc4dc9:nano-community-tasks"
    ],
    ["p", "99c2aa85d2b21a62f396907a802a58e521dafd5bddaccbd72786eea189bc4dc9"],
    ["subject", "Add a dark-mode toggle to the board"]
  ],
  "content": "The board ignores the site theme.",
  "pubkey": "8a3ba5c99568d26602f4cf8038371da3c86057a96eb1b6a8de1b4f1be723c236",
  "id": "2a93bec6e9b3b76081368e00ccbf582b2ffdadd12399d251d2ad961f576a741d",
  "sig": "5abd31a82e63de13940c1b59ac4a68af7995273c615e434dda3325a35db1473b342c3fe6f92dc4348c2327e5a9e96598f3fb7723354f9705a3f52f377b572b94"
}
```

**Issues are immutable.** A kind 1621 event is a regular event and cannot be edited. To change a title or description, a steward closes the old issue (1632) and files a new one with an `e` tag marked `supersedes` that points at the old issue.

```json
{
  "kind": 1621,
  "created_at": 1767225610,
  "tags": [
    [
      "a",
      "30617:99c2aa85d2b21a62f396907a802a58e521dafd5bddaccbd72786eea189bc4dc9:nano-community-tasks"
    ],
    ["p", "99c2aa85d2b21a62f396907a802a58e521dafd5bddaccbd72786eea189bc4dc9"],
    ["subject", "Old title"]
  ],
  "content": "Superseded.",
  "pubkey": "5f64993ccb4044a005e82ba07e78b2815a6a17aa7d5ad62fd59d519778072483",
  "id": "3bbdc9770be35ca159ccf837a8c00eef0064579d71c9a204a7a1299396a20cb2",
  "sig": "776d62db451a601968b9a588d1aa2abd11fa30953c8fedf0c09e7a35a192e9b0ecf0f4c9799734684f7347733b13694f85d9d9faf042c17151bec9380c279974"
}
```

```json
{
  "kind": 1621,
  "created_at": 1767225659,
  "tags": [
    [
      "a",
      "30617:99c2aa85d2b21a62f396907a802a58e521dafd5bddaccbd72786eea189bc4dc9:nano-community-tasks"
    ],
    ["p", "99c2aa85d2b21a62f396907a802a58e521dafd5bddaccbd72786eea189bc4dc9"],
    ["subject", "New title"],
    [
      "e",
      "3bbdc9770be35ca159ccf837a8c00eef0064579d71c9a204a7a1299396a20cb2",
      "",
      "supersedes"
    ]
  ],
  "content": "Reissued.",
  "pubkey": "5f64993ccb4044a005e82ba07e78b2815a6a17aa7d5ad62fd59d519778072483",
  "id": "c574929fa756a4e0e8764c696da6329d053af8f486fec8db0a2503c8bc6a2902",
  "sig": "599db77653741eb207b58e3a4380f30baff81343333713bb7b095f871c24f30afa99ff58d41abb884ecf32f2da0f47b5c5b97e4da5fb8bc927b02e32293a69e3"
}
```

## Lifecycle

Status is a NIP-34 status event. The latest status from the **issue author or a steward** counts; statuses from anyone else are ignored. An issue with no valid status is open.

| Kind | Status   |
| ---- | -------- |
| 1630 | open     |
| 1631 | resolved |
| 1632 | closed   |
| 1633 | draft    |

| Tag | Meaning                                             |
| --- | --------------------------------------------------- |
| `e` | `["e", <issue-id>, "", "root"]`                     |
| `a` | The board address                                   |
| `p` | The board owner, then the issue author if different |

```json
{
  "kind": 1630,
  "created_at": 1767225661,
  "tags": [
    [
      "e",
      "5c27f254991224199cfeaa398b2a1c2e1b6fae5efe79cdbc0662f61ee92aa012",
      "",
      "root"
    ],
    [
      "a",
      "30617:99c2aa85d2b21a62f396907a802a58e521dafd5bddaccbd72786eea189bc4dc9:nano-community-tasks"
    ],
    ["p", "99c2aa85d2b21a62f396907a802a58e521dafd5bddaccbd72786eea189bc4dc9"],
    ["p", "5f64993ccb4044a005e82ba07e78b2815a6a17aa7d5ad62fd59d519778072483"]
  ],
  "content": "",
  "pubkey": "5f64993ccb4044a005e82ba07e78b2815a6a17aa7d5ad62fd59d519778072483",
  "id": "be112807830864964594e71f17241ff12b93135f96b99be440b75aaeb0417c50",
  "sig": "bc0a7278ea94e94189c80c102959fb549a142dbd90a421abe4196b6866cbf84022049c9c087957620995d52f506a807dc835a801ac7fca06ddfd937ef6097637"
}
```

```json
{
  "kind": 1633,
  "created_at": 1767225801,
  "tags": [
    [
      "e",
      "2a93bec6e9b3b76081368e00ccbf582b2ffdadd12399d251d2ad961f576a741d",
      "",
      "root"
    ],
    [
      "a",
      "30617:99c2aa85d2b21a62f396907a802a58e521dafd5bddaccbd72786eea189bc4dc9:nano-community-tasks"
    ],
    ["p", "99c2aa85d2b21a62f396907a802a58e521dafd5bddaccbd72786eea189bc4dc9"],
    ["p", "8a3ba5c99568d26602f4cf8038371da3c86057a96eb1b6a8de1b4f1be723c236"]
  ],
  "content": "",
  "pubkey": "8a3ba5c99568d26602f4cf8038371da3c86057a96eb1b6a8de1b4f1be723c236",
  "id": "18d2d1ef1ce7557ed738c6defdf906225926be545641b786e7d4aca9cc9702bc",
  "sig": "967b4a1f5516051d09f994ab6530f2ca77d2aecbca48e38a551e107ceb1d1a4eb995f3b1d278ffefbbfc2bf2a9ebb76499d2e5a95042586dfd941d41a9da3c12"
}
```

```json
{
  "kind": 1632,
  "created_at": 1767225659,
  "tags": [
    [
      "e",
      "3bbdc9770be35ca159ccf837a8c00eef0064579d71c9a204a7a1299396a20cb2",
      "",
      "root"
    ],
    [
      "a",
      "30617:99c2aa85d2b21a62f396907a802a58e521dafd5bddaccbd72786eea189bc4dc9:nano-community-tasks"
    ],
    ["p", "99c2aa85d2b21a62f396907a802a58e521dafd5bddaccbd72786eea189bc4dc9"],
    ["p", "5f64993ccb4044a005e82ba07e78b2815a6a17aa7d5ad62fd59d519778072483"]
  ],
  "content": "Superseded by a reissue.",
  "pubkey": "5f64993ccb4044a005e82ba07e78b2815a6a17aa7d5ad62fd59d519778072483",
  "id": "39e6519c1fb9817e353ecd00cf0f130e93511e5c511e55d95b6bbe858fb075f1",
  "sig": "9d3051bfced17b3ccd39f67229c0e8037add564386e9cd4bf289898b16f02e84eb0506acce7aadb44d97c56b67f2ca11b68584b07908783cdb3b789492c21b02"
}
```

```json
{
  "kind": 1631,
  "created_at": 1767225900,
  "tags": [
    [
      "e",
      "c574929fa756a4e0e8764c696da6329d053af8f486fec8db0a2503c8bc6a2902",
      "",
      "root"
    ],
    [
      "a",
      "30617:99c2aa85d2b21a62f396907a802a58e521dafd5bddaccbd72786eea189bc4dc9:nano-community-tasks"
    ],
    ["p", "99c2aa85d2b21a62f396907a802a58e521dafd5bddaccbd72786eea189bc4dc9"],
    ["p", "5f64993ccb4044a005e82ba07e78b2815a6a17aa7d5ad62fd59d519778072483"]
  ],
  "content": "",
  "pubkey": "5f64993ccb4044a005e82ba07e78b2815a6a17aa7d5ad62fd59d519778072483",
  "id": "ebe9d1aae003bd8229d394160060a98fef62c36c62af9f87964d3ae236c816b6",
  "sig": "45b3a1549e418ef538b1be5ccc9507119a77b70ef268e6a88ef91bd81631b6709f4d6ba0d95918d6caeed0079df6102690eb80d84a8ab577fa2a0b9500730c8e"
}
```

## Priority and state

Priority and state are NIP-32 labels (kind 1985), **honoured only from stewards**. Each label event carries exactly one namespace and targets one or more issues with `e` tags. Per issue and namespace, the latest steward label wins; on equal `created_at` the lowest event id wins.

| Namespace                 | Values                                               |
| ------------------------- | ---------------------------------------------------- |
| `community.nano.priority` | `critical`, `high`, `medium`, `low`, `unprioritized` |
| `community.nano.state`    | `blocked`, `paused`, `actionable`                    |

`unprioritized` is a deliberate steward decision. It moves a task out of triage without ranking it.

```json
{
  "kind": 1985,
  "created_at": 1767225662,
  "tags": [
    ["L", "community.nano.priority"],
    ["l", "high", "community.nano.priority"],
    ["e", "5c27f254991224199cfeaa398b2a1c2e1b6fae5efe79cdbc0662f61ee92aa012"]
  ],
  "content": "",
  "pubkey": "5f64993ccb4044a005e82ba07e78b2815a6a17aa7d5ad62fd59d519778072483",
  "id": "8e6bd0258e3d5b36cc146deb7d4ed9fe38266d8c3f07df117399e611ed5755f8",
  "sig": "8fd99548cf70968f646799de15a99749ce7ab747b09c49a8b7e0bdd805b2732941e00c6e2858a3c073d767ffec98a3eafec00a84633a817ae131473346158e1e"
}
```

```json
{
  "kind": 1985,
  "created_at": 1767225662,
  "tags": [
    ["L", "community.nano.state"],
    ["l", "actionable", "community.nano.state"],
    ["e", "5c27f254991224199cfeaa398b2a1c2e1b6fae5efe79cdbc0662f61ee92aa012"]
  ],
  "content": "",
  "pubkey": "5f64993ccb4044a005e82ba07e78b2815a6a17aa7d5ad62fd59d519778072483",
  "id": "343510b44ce31361bc7676bc2f666fb0e289b5e6b3712615700367ae689fe491",
  "sig": "14352a0a0d81d19592ee6d77009fd10a9cb79fb52004dadac5699f438b5ec207a6fc51a7faa42da174566bfa653f0dcad54fc0841b7e897751e9fad67060351e"
}
```

## Claim (kind 30634)

A claim says "I am working on this". Anyone may claim any open task, and several people may claim the same task.

| Tag          | Meaning                                                  |
| ------------ | -------------------------------------------------------- |
| `d`          | The issue id                                             |
| `e`          | The issue id                                             |
| `a`          | The board address                                        |
| `status`     | `active` or `released`                                   |
| `expiration` | NIP-40 expiry, default 30 days (2592000 s) after signing |

- A claim is active while its `status` is `active` and its expiration has not passed.
- A claim lapses at its `expiration`, capped at 30 days after its `created_at`. A claim without `expiration` lapses at that cap.
- A newer claim replaces the claimant's previous one only if its `created_at` is strictly greater; on equal `created_at` the lowest event id wins. A client re-signing a claim dates it after the previous one.
- Only the claimant renews a claim, by signing it again. Every client, including scripts and agents, re-signs the claimant's claim when the claimant comments on, claims or changes the status of the task. A claim otherwise lapses on its own.
- Releasing is a new claim event with `status` = `released`.
- Clients merge claims across relays by pubkey and `d`, newest first.

```json
{
  "kind": 30634,
  "created_at": 1767225720,
  "tags": [
    ["d", "5c27f254991224199cfeaa398b2a1c2e1b6fae5efe79cdbc0662f61ee92aa012"],
    ["e", "5c27f254991224199cfeaa398b2a1c2e1b6fae5efe79cdbc0662f61ee92aa012"],
    [
      "a",
      "30617:99c2aa85d2b21a62f396907a802a58e521dafd5bddaccbd72786eea189bc4dc9:nano-community-tasks"
    ],
    ["status", "active"],
    ["expiration", "1769817720"]
  ],
  "content": "",
  "pubkey": "8a3ba5c99568d26602f4cf8038371da3c86057a96eb1b6a8de1b4f1be723c236",
  "id": "67ba999c66669ea1ab7e6a27e0e7822e00a5bd66bd474264b8917b84aa3a1a37",
  "sig": "92c6c9e877a6085e9ca153874b2630fcd005a7ae350a28c0b283ab480c841a7c8a08118207a4e9ab6095fa5129344985a1dabb8bc864e20d47427ba24e3afeeb"
}
```

## Comment

Comments are NIP-22 (kind 1111) with plaintext content. The root is always the issue; the parent is the issue or the comment being answered.

| Tag | Meaning                                 |
| --- | --------------------------------------- |
| `E` | Root issue id, relay hint, issue author |
| `K` | `1621`                                  |
| `P` | Issue author                            |
| `e` | Parent id, relay hint, parent author    |
| `k` | Parent kind (`1621` or `1111`)          |
| `p` | Parent author                           |

```json
{
  "kind": 1111,
  "created_at": 1767225721,
  "tags": [
    [
      "E",
      "5c27f254991224199cfeaa398b2a1c2e1b6fae5efe79cdbc0662f61ee92aa012",
      "",
      "5f64993ccb4044a005e82ba07e78b2815a6a17aa7d5ad62fd59d519778072483"
    ],
    ["K", "1621"],
    ["P", "5f64993ccb4044a005e82ba07e78b2815a6a17aa7d5ad62fd59d519778072483"],
    [
      "e",
      "5c27f254991224199cfeaa398b2a1c2e1b6fae5efe79cdbc0662f61ee92aa012",
      "",
      "5f64993ccb4044a005e82ba07e78b2815a6a17aa7d5ad62fd59d519778072483"
    ],
    ["k", "1621"],
    ["p", "5f64993ccb4044a005e82ba07e78b2815a6a17aa7d5ad62fd59d519778072483"]
  ],
  "content": "Taking this one; draft by Friday.",
  "pubkey": "8a3ba5c99568d26602f4cf8038371da3c86057a96eb1b6a8de1b4f1be723c236",
  "id": "589104a7fc723441061b865b458727bbf829c3174c25356294b45663559aa813",
  "sig": "0bacb0ed5c375ff57a512d3fc71cc69d0f80d7bda24f1782de761b3c1586eb0abfc8f1298b52516b9e2f55e0852d7b4fc2e0ed35dfad9e40506157fc338bd763"
}
```

## Trusted contributors (triage set)

Each steward publishes a NIP-51 follow set (kind 30000) with `d` = `nano-community-contributors`, listing pubkeys they vouch for. The union of every steward's latest set is the **trusted set**.

```json
{
  "kind": 30000,
  "created_at": 1767225670,
  "tags": [
    ["d", "nano-community-contributors"],
    ["title", "Nano community trusted contributors"],
    ["p", "8a3ba5c99568d26602f4cf8038371da3c86057a96eb1b6a8de1b4f1be723c236"]
  ],
  "content": "",
  "pubkey": "5f64993ccb4044a005e82ba07e78b2815a6a17aa7d5ad62fd59d519778072483",
  "id": "3d922284cb3c90fce0bfbe0b716568e0e2ecd228fff2ae3bc827f36ac1a8127c",
  "sig": "6f1222e772262e12e43cb2f8e609ca9f5f4b671ae7b47d74a8b5ea2aafb230ff15d4ad7d922d947173bb5a83eea122f4963058ec247cb4de295bbdc0b906319a"
}
```

## Retraction

A NIP-09 deletion request (kind 5) removes the requester's own events from the default view. A deletion request for someone else's event is ignored. Relays may keep the event; deletion is a request, not a guarantee.

```json
{
  "kind": 5,
  "created_at": 1767226000,
  "tags": [
    ["e", "3bbdc9770be35ca159ccf837a8c00eef0064579d71c9a204a7a1299396a20cb2"],
    ["k", "1621"]
  ],
  "content": "Task is no longer public.",
  "pubkey": "5f64993ccb4044a005e82ba07e78b2815a6a17aa7d5ad62fd59d519778072483",
  "id": "8edeb7382bdf5551691d8083bdfe04114dd4c0a7f9ae4a6f7e190f9c75eac527",
  "sig": "92b08acb5b001191bf18724752036cfa0f4ecea110841401f4dda6fe3d7bcc02244291f281c8fb7fe3205818731a823d0f960c0516ad0eb5aab6507fd6f4e69e"
}
```

## Default view rules

Every client is expected to derive the same board from the same events. The reference implementation is `common/task-board/build-task-board-state.mjs` in the nano-community repository.

1. **Stewards** come from the owner's latest announcement.
2. **Trusted** pubkeys are the union of the stewards' triage sets.
3. **Status** is the latest valid status, default open.
4. **Labels** are the latest steward label per namespace.
5. **Claims** are merged per claimant, newest first, and counted only while active.
6. Each task falls in one column, checked in this order:
   - **Draft:** status draft.
   - **Closed:** status resolved or closed.
   - **In progress:** open, with at least one active claim.
   - **Blocked or paused:** steward state `blocked` or `paused`.
   - **Triage:** open, with no steward priority label.
   - **Needs a taker:** everything else.
7. Issues whose author is neither a steward nor trusted are **hidden** from the columns and still reachable by direct link.
8. Each column is sorted by steward priority (`critical` first, unlabelled last), then by latest activity (newest first), then by id.

Latest activity is the newest `created_at` among the issue and its valid statuses, labels, claims and comments.

## Pledge (kind 30635)

A pledge is a public, non-custodial promise to pay a Nano amount to whoever completes a task. Funds never pass through the board.

| Tag            | Meaning                                                            |
| -------------- | ------------------------------------------------------------------ |
| `d`            | The issue id                                                       |
| `e`            | The issue id                                                       |
| `a`            | The board address                                                  |
| `amount`       | Amount in raw units                                                |
| `nano_account` | The pledging Nano account                                          |
| `nano_sig`     | Signature by that account over the pledge, in the canonical format |
| `payout`       | Optional. Nano block hash of the payment, verified on chain        |

The Nano signature uses the canonical Nano signed-message format defined by the nano-community signed-message specification. Pledges are specified here and implemented separately; clients that do not implement them ignore kind 30635.

## Nano account binding

A nostr key binds a Nano account with a NIP-39 external identity (kind 10011), using the `i` tag `["i", "nano:<nano_account>", <proof>]`. The proof is a canonical-format Nano signature by that account over the NIP-39 sentence `Verifying that I control the following Nostr public key: <npub>`.

## Relays

Clients publish to every relay in the board's `relays` tag and read from all of them.

- `wss://relay.nano.community` is the community relay. It accepts only board events and is the reference for completeness.
- Public relays in the default set are best-effort replicas.
- Every board relay serves TLS (`wss:`), so browser clients with a strict content security policy can reach them.

The community relay accepts kinds 0, 5, 1111, 1621, 1630-1633, 1985, 10011, 30000, 30617, 30634 and 30635. Board-bound events must carry the board `a` tag or an `e`/`E` tag to a known board issue. Kinds 0 and 10011 are accepted only from pubkeys that already have a board event.

## Clients

Each client location appears as a `web` tag on the board announcement.

- [nano.community/roadmap](https://nano.community/roadmap), the web portal.
- The stand-in client, a single static file published as a NIP-5A site (`d` = `nano-tasks`). It also works opened from disk.
- [gitworkshop.dev](https://gitworkshop.dev), which reads the same issue, status and comment events.

## Worked example keys

The examples above are signed with throwaway keys. They verify and reduce to a board, and the nano-community test suite checks both.

| Role        | Pubkey                                                             |
| ----------- | ------------------------------------------------------------------ |
| Owner       | `99c2aa85d2b21a62f396907a802a58e521dafd5bddaccbd72786eea189bc4dc9` |
| Steward     | `5f64993ccb4044a005e82ba07e78b2815a6a17aa7d5ad62fd59d519778072483` |
| Contributor | `8a3ba5c99568d26602f4cf8038371da3c86057a96eb1b6a8de1b4f1be723c236` |
