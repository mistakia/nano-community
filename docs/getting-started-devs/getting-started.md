---
title: Development
description: Building with and developing Nano
tags: nano, crypto, development, building, dev, guide, getting started
---

# Getting Started

| Resources                                                                                                                                                                   | Description                                                                                                                                                     |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| <a href="https://docs.nano.org/integration-guides/the-basics/" target="_blank">Integration Guides</a>                                                                       | Comprehensive guides of the basics, key management, block confirmation tracking, work generation, compiling and running a node, websockets, and advanced setups |
| <a href="https://nano.org/tools" target="_blank">Tools & Libraries</a>                                                                                                      | List of community tools in various platforms and languages                                                                                                      |
| <a href="https://docs.nano.org/running-a-node/test-network/" target="_blank">Test network</a>                                                                               | Information about how to join and use the test network                                                                                                          |
| <a href="https://tools.nanos.cc/" target="_blank">tools.nanos.cc</a>                                                                                                        | Helpful tools for unit conversion, key management, block generation, common RPC queries                                                                         |
| [Design Overview & Reference](/design/basics)                                                                                                                               | An overview and reference to common Nano protocol details                                                                                                       |
| [Documentation](/getting-started-devs/documentation)                                                                                                                        | Links to documentation information                                                                                                                              |
| <a href="https://medium.com/nanocurrency/getting-started-developing-with-nano-currency-part-1-build-your-foundation-cec2013657e1" target="_blank">Getting Started Guide</a> | A step-by-step getting started guide by SomeNano                                                                                                                |

Do not hesitate to reach out to the community to start a [discussion](/community) or get [support](/support).

## Introduction

Below are a couple of key basics to know to get you going quickly. For a more comprehensive guide, view the <a href="https://docs.nano.org/integration-guides/the-basics/" target="_blank">Official Integration Guides</a>.

If you are interested in directly contributing to nano development or its ecosystem, view the [contribution guides](/contributing).

### Block-lattice

Nano's unique ledger structure, known as block-lattice, underpins its functionality. Each account has its own blockchain (account-chain), where each block is a single operation that contains the entire state for that account (balance & representative). Thus, the latest block for each account (called a frontier) is all you need to know the current state for a given account. Blocks belong to an account, thus only the private key holder can produce a valid block for that account.

### Account

An account is a public-private key-pair most commonly derived deterministically from a seed. Changes to the state of an account can only be made using the private key for that account.

### Seed

A series of 32 random bytes of data, usually represented as a 64 character, uppercase hexadecimal string (0-9A-F). This value is used to derive account private keys for accounts by combining it with an index and then putting that into the following hash function where `||` means concatenation and `i` is a 32-bit big-endian unsigned integer:

```
PrivK[i] = blake2b(outLen = 32, input = seed || i)
```

Private keys are derived deterministically from the seed, which means that as long as you put the same seed and index into the derivation function, you will get the same resulting private key every time.

### Account Private Key

A 32-byte value, usually represented as a 64 character, uppercase hexadecimal string (0-9A-F). It can either be random (an ad-hoc key) or derived from a seed, as described above.

### Account Public Key

A 32-byte value, usually represented as a 64 character, uppercase hexadecimal string (0-9A-F). It is derived from an account private key by using the ED25519 curve using Blake2b-512 as the hash function (instead of SHA-512). Usually account public keys will not be passed around in this form, rather the below address is used.

### Account Address

A string that starts with `nano_` (previously `xrb_`), then has 52 characters which are the account public key but encoded with a specific base32 encoding algorithm to prevent human transcription errors by limiting ambiguity between different characters (no O and 0 for example). Then the final 8 characters are Blake2b-40 checksum of the account public key to aid in discovering typos, also encoded with the same base32 scheme (5 bytes).

<figure>
    <img alt='Nano account address encoding' src='/resources/account-address.png' />
    <figcaption>Ex. nano_1anrzcuwe64rwxzcco8dkhpyxpi8kd7zsjc1oeimpc3ppca4mrjtwnqposrs</figcaption>
</figure>

### Wallet ID

Is just a local UUID that references a specific wallet (set of seed/private keys/info about them) in the node's local database file (pertaining to the reference C++ node implementation). Do not confuse this with a seed or private key.

### Transactions

Given that an account's state can only be updated by the corresponding secret key, a transaction consists of two operations / blocks.

1. **Send block**: the sender broadcasts an operation that deducts the balance of their account by the amount they are sending
2. **Receive block**: the receiver broadcasts an operation that references the sender's operation and increases the balance of their account by the amount sent to them

Once the send block is confirmed by the network, the transaction is irreversible and the receiver can broadcast a receive block at any point in the future to update their balance and use the funds sent to them. Thus, the total amount of nano across send blocks without a corresponding receive block is referred to as a "Receivable Balance".

## Accessing the Network

The most common way to access the network is through RPC commands to either a local or public node.

- <a href="https://docs.nano.org/commands/rpc-protocol/" target="_blank">RPC Documentation</a>
- <a href="https://nano.casa/public-nodes" target="_blank">Public Nodes Tracker (nano.casa)</a>
- <a href="https://publicnodes.somenano.com/" target="_blank">Public Nodes Tracker (somenano.com)</a>
- [Running a node](/getting-started-devs/running-a-node)

## Basics

### Generating an account

In most situations, you'll want to derive an account from a seed and it's best to use an existing library. For a more comprehensive guide, view the <a href="https://docs.nano.org/integration-guides/key-management/" target="_blank">key management</a> section of the Official Integration Guides.

```js [g1:JavaScript]
import { wallet as walletLib } from 'nanocurrency-web'
const wallet = walletLib.generate()
```

```python [g1:Python]
import nanolib
seed = nanolib.generate_seed()
account_id = nanolib.generate_account_id(seed, 0)
```

#### Libraries

##### Node.js / JavaScript

| Name                                                              | Description                                                                                                                           |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| [nanocurrency-web](https://github.com/numsu/nanocurrency-web-js)  | Toolkit for Nano cryptocurrency client side offline integrations without requiring NodeJS functions                                   |
| [nanocurrency-js](https://github.com/marvinroger/nanocurrency-js) | 🔗 A toolkit for the Nano cryptocurrency, allowing you to derive keys, generate seeds, hashes, signatures, proofs of work and blocks. |
| [Nano.js](https://github.com/WriteNaN/Nano.js)                    | Library to interact with the nano blockchain through javascript                                                                       |

##### Typescript

| Name                                             | Description                                                              |
| ------------------------------------------------ | ------------------------------------------------------------------------ |
| [nona-lib](https://github.com/tgerboui/nona-lib) | TypeScript library to simplify interactions with the Nano currency node. |

##### Dart

| Name                                               | Description                                                                                                     |
| -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| [nanodart](https://github.com/appditto/nanodart) | Dart library for the NANO and BANANO cryptocurrencies - supports key generation, signing, encryption, and more. |
| [nanoutil](https://github.com/perishllc/nanoutil)  | A Nano and Banano cryptocurrency library for the Dart programming language                                      |

##### Python

| Name                                                      | Description                                                                                                                                    |
| --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| [nanolib](https://github.com/Matoking/nanolib)            | Python library for working with the NANO cryptocurrency protocol                                                                               |
| [nanopy](https://github.com/npy0/nanopy)                  | Python implementation of NANO related functions                                                                                                |
| [pippin](https://github.com/appditto/pippin_nano_wallet)  | A high performance, lightweight alternative to the NANO Node developer wallet (includes production wallet)                                     |
| [nanohakase](https://github.com/stjet/nanohakase)         | Nanohakase is a python library for the Nano cryptocurrency. It aims to be the simplest Nano library out there, and is a self fork of Bananopie |
| [nano-rpc-py](https://github.com/gr0vity-dev/nano-rpc-py) | python library that dynamically generates methods based on a commands dictionary                                                               |

##### Rust

| Name                                                  | Description                               |
| ----------------------------------------------------- | ----------------------------------------- |
| [nanopyrs](https://github.com/expiredhotdog/nanopyrs) | Rust rewrite of the Python nanopy library |

##### Ruby

| Name                                      | Description                                                                      |
| ----------------------------------------- | -------------------------------------------------------------------------------- |
| [nanook](https://github.com/lukes/nanook) | Ruby library for making and receiving payments and managing a nano currency node |

##### .NET

| Name                                               | Description             |
| -------------------------------------------------- | ----------------------- |
| [Nano.NET](https://github.com/miguel1117/Nano.Net) | A .NET library for Nano |

##### Java

| Name                                            | Description                                               |
| ----------------------------------------------- | --------------------------------------------------------- |
| [jNano](https://github.com/nano-java/nano-java) | A comprehensive Java library for the Nano cryptocurrency. |

##### Go

| Name                                          | Description                                      |
| --------------------------------------------- | ------------------------------------------------ |
| [gonano](https://github.com/hectorchu/gonano) | Go language support for Nano, a digital currency |

##### Swift

| Name                                              | Description                                  |
| ------------------------------------------------- | -------------------------------------------- |
| [NanoSwift](https://github.com/Priva28/NanoSwift) | A Swift library for the Nano cryptocurrency. |

#### Notable RPC Commands

- <a href="https://docs.nano.org/commands/rpc-protocol/#key_create" target="_blank">key_create</a> — create random adhoc keypair
- <a href="https://docs.nano.org/commands/rpc-protocol/#key_expand" target="_blank">key_expand</a> — derive public key and address from a private key

### Building a block

Depending on what type of block you are creating (send, receive, open, change), you will need to know the following properties:

#### Send

| Field          | Description                                                  |
| -------------- | ------------------------------------------------------------ |
| previous       | hash of the previous block                                   |
| representative | address of the representative, must match the previous block |
| account        | account the block belongs to                                 |
| balance        | previous balance minus the amount being sent (in raw)        |
| link           | address you are sending to                                   |

#### Receive

| Field          | Description                                                              |
| -------------- | ------------------------------------------------------------------------ |
| previous       | hash of the previous block                                               |
| representative | address of the representative, must match the previous block             |
| account        | account the block belongs to                                             |
| balance        | previous balance plus the amount being sent in the linked block (in raw) |
| link           | block hash of the send transaction to this account                       |

#### Open

The first transaction on an account-chain, which is always a receive, is referred to as an open block. It's a receive but the previous field is all zeros.

| Field          | Description                                                              |
| -------------- | ------------------------------------------------------------------------ |
| previous       | will be 0 since it's the first block                                     |
| representative | address of the representative, must match the previous block             |
| account        | account the block belongs to                                             |
| balance        | previous balance plus the amount being sent in the linked block (in raw) |
| link           | block hash of the send transaction to this account                       |

#### Change

| Field          | Description                       |
| -------------- | --------------------------------- |
| previous       | hash of the previous block        |
| representative | address of the new representative |
| account        | account the block belongs to      |
| balance        | previous balance                  |

#### Notable RPC Commands

- <a href="https://docs.nano.org/commands/rpc-protocol/#account_info" target="_blank">account_info</a> — used to get needed fields
- <a href="https://docs.nano.org/commands/rpc-protocol/#accounts_pending" target="_blank">accounts_pending</a> — get sends that haven't been received
- <a href="https://docs.nano.org/commands/rpc-protocol/#block_create" target="_blank">block_create</a> — create a block (not available on all public nodes)

### Generating Work

Every block published to the network, whether a send, receive, or representative change block, requires a small, valid Proof-of-Work to be completed above a minimum difficulty floor (threshold). As of V21, this threshold is different for different block types: send and change blocks require a higher threshold, while receive blocks are lower.

The Proof-of-Work nonce is calculated against the hash of the previous block, or the account public key if it is for an open block.

| block type     | difficulty threshold | calculated against  |
| -------------- | -------------------- | ------------------- |
| Send or Change | fffffff800000000     | previous block hash |
| Receive        | fffffe0000000000     | previous block hash |
| Open           | fffffe0000000000     | account public key  |

#### Proof-of-Work Resources

- <a href="https://github.com/nanocurrency/nano-work-server" target="_blank">Nano work server</a> — rust / official work server
- <a href="https://github.com/marvinroger/nanocurrency-js/tree/master/packages/nanocurrency" target="_blank">nanocurrency-js</a> — node.js / js
- <a href="https://github.com/Inkeliz/nanopow" target="_blank">nanopow</a> — golang
- <a href="https://github.com/catenocrypt/nano-work-cache" target="_blank">nano-work-cache</a> — golang

### Broadcasting a block

To publish a block to the network, you would use the `process` RPC command of a node.

#### Notable RPC Commands

- <a href="https://docs.nano.org/commands/rpc-protocol/#process" target="_blank">process</a> — broadcast block
- <a href="https://docs.nano.org/commands/rpc-protocol/#republish" target="_blank">republish</a> — rebroadcast block

### Confirming a block

The most efficient way to watch for block confirmations is via <a href="https://docs.nano.org/integration-guides/websockets/" target="_blank">WebSockets</a>. Additionally, you can check the status of a given block via RPC using `block_info`.

#### Notable RPC Commands

- <a href="https://docs.nano.org/commands/rpc-protocol/#block_info" target="_blank">block_info</a> — get the confirmation status
- <a href="https://docs.nano.org/commands/rpc-protocol/#block_confirm" target="_blank">block_confirm</a> — request confirmation for a block

## Using the test network

The test network exists primarily to conduct general integration and node upgrade testing in light volumes. By providing a network with similar parameters to the main network (work difficulty, etc.) this is the best environment for connecting test or staging versions of services and applications to for small scale tests.

Visit the official docs for more information about the <a href="https://docs.nano.org/running-a-node/test-network/" target="_blank">test network</a>.

### Getting Test Funds

Once you have a node up and running the ledger should bootstrap from the network quickly, and then you just need some test network-specific Nano funds. We are currently working on a faucet setup to enable self-service options, but for now please reach out to `argakiig#1783` on Discord or email infrastructure@nano.org with the account number you would like funds distributed to for the test network.

## What to build

- tip bots (<a href="https://github.com/mitche50/NanoTipBot" target="_blank">NanoTipBot</a> / <a href="https://github.com/danhitchcock/nano_tipper_z" target="_blank">nano_tipper_z</a> / <a href="https://github.com/danhitchcock/RedditTipBot" target="_blank">RedditTipBot</a> / <a href="https://github.com/bbedward/graham_discord_bot" target="_blank">discord tip bot</a>)
- integrate with gaming (<a href="https://github.com/wezrule/UE4NanoPlugin" target="_blank">Nano Plugin Unreal Engine 4</a>)
- wallets (<a href="https://github.com/Nault/Nault" target="_blank">Nault</a> / <a href="https://github.com/appditto/natrium_wallet_flutter" target="_blank">Natrium</a>)
- merchant payment services
- streaming plugins for payments, tips, donations
- pay per use integration (articles)
