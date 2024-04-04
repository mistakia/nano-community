---
title: Glossary Terms
description: Common terms used when discussing the nano cryptocurrency protocol and project
tags: what, does, mean, nano, docs, glossary, terms, documentation, crypto, protocol, cryptocurrency
---

# Glossary

### account

Refers to a public address (starts with `xrb*` or `nano*` which are interchangeable) derived from a private key. An address is a reinterpretation of the 256-bit public key using BASE32 encoding and a checksum. Previously supported `xrb-` or `nano-` prefixes are deprecated.

### active transaction

A newly downloaded block to the node which enters into the voting process.

### ad hoc accounts

Accounts not derived from a private seed which can be held in the node wallet through the wallet ID. These accounts are only recommended for use with advanced systems.

### announcement rounds

A repeating half-second cycle on the node during which votes are collected for active transactions in attempt to reach quorum.

### block

A single Nano transaction. All new transactions (e.g. sends, receives, representative changes, etc) on the Nano Protocol are communicated via state blocks (since node V11). The account's entire state, including the balance after each transaction, is recorded in each block. Transaction amounts are interpreted as the difference in balance between consecutive blocks. Before V11, each transaction type (open, send, receive, change) had its own legacy block type.

### block hash

A 64 character, uppercase hexadecimal string (0-9A-F) value representing a unique block on an account.

### block height

A local integer value that represents the order of a block in an account chain. For example, the 15th block in an account would have a block height of 15. Related to (but different from) confirmation height.

### block lattice

The Block Lattice is a data-structure in which individual accounts control their own blockchain. This allows transactions to be added quickly without conflict and sent to the network for confirmation.

### blocks per second (BPS)

The transmission rate of unconfirmed blocks (transactions) on the network.

### bootstrap network

A sub-network established between peers via Transmission Control Protocol (TCP) for managing bulk transmission of blocks. This is used on initial bootstrapping of peers and when out-of-sync peers attempt to fill large gaps in their ledgers. This is available within all Nano networks (main, beta and test networks).

### bootstrapping

During initial sync, the nano_node requests old transactions to independently verify and populate its local ledger database. Bootstrapping will also occur when the nano_node becomes out of sync with the network.

### burn

When a 'burn' takes place, funds are sent to a specific address that no one can access. Because no one can ever access funds sent to a burn address, it reduces the circulating supply.

### burn address

The address whose public key is all zeros. This address was used to destroy part of the supply created by the genesis account that was not distributed.

```
nano_1111111111111111111111111111111111111111111111111111hifc8npp
```

### circulating supply

Ӿ 133,248,297.920938463463374607431768211455. This is the supply that resulted after burns were made from the genesis account, landing account and faucet account, following original distribution. Actual circulating supply is lower due to lost keys and sends to burn accounts. The original supply minus any amounts sent to the burn account can be found using the available_supply RPC.

### cementing

When a specific node marks a confirmed transaction as locally irreversible by setting the account's confirmation height (in the node database) to the now higher block height of the confirmed transaction. Cementing is a node-level operation.

### confirmation

When a block (transaction) gathers enough votes from the network to pass quorum. Note that confirmed sends are irreversible (i.e. fully-settled), but the receiver must publish a corresponding receive block before they will be able to spend the pending funds. Confirmation is a network-level decision.

### confirmation height

A number stored in the local node database that represents the highest (most recent) confirmed block in an account chain. Related to (but different from) block height.

### Confirmations Per Second (CPS)

The rate of confirmed blocks (send or receive).

### Deterministic finality

A transaction is irreversibly final and canonical when a given event is observed. When a node observes a quorum of votes for a given block, it will permanently include that block in its ledger.

Unlike probabilistic finality, deterministic finality achieves irreversible finality.

### election

The process of broadcasting and requesting votes for a block in order to confirm it.

### election states

passive, active, broadcasting, inactive, expired-inactive, and expired-confirmed.

### faucet

A service that gives away and distributes Nano.

### frontier / head block

The most recent block added to the account chain. Also called the head block. Can be either confirmed or unconfirmed.

### genesis

The first account to be created, containing the maximum amount of Nano to ever exist. From here the funds were sent to other wallets; for distribution or to be burned.

### inbound send

A block with funds being transferred to an account owned by a wallet on your node.

### legacy blocks

Blocks on an account chain before the first v1 block (which is often the v1 epoch block but can be other types). The first v1 block and all subsequent blocks are stateful blocks.

### live network

A sub-network established between peers via Transmission Control Protocol (TCP) for communicating newly published blocks, votes and other non-bootstrap related traffic. This is available within all Nano networks (main, beta and test networks). In versions prior to V19, this was done via User Datagram Protocol (UDP). UDP was retained as a fallback for peer connection for versions 19 and 20. As of V21, use of UDP is deprecated.

### node version

The version used to identify a unique release build of the node. Each node version is tied to a single protocol version, but they are updated independently.

### online voting weight

Also called online stake, it is a trended value. The node samples online representative weights every 5 minutes across a rolling 2 week period. The online voting weight value is the median of those samples.

### open representative voting (ORV)

A consensus mechanism unique to Nano which involves accounts delegating their balance as voting weight to Representatives. The Principal Representatives (PRs) vote on the validity of transactions published to the network. A vote is worth the sum of vote weight delegated to the PR. These votes are shared with their directly connected peers and they also rebroadcast votes seen from Principal Representatives. Votes are tallied and once quorum is reached on a published block, it is considered confirmed by the network.

### peers

Nodes connected over the public internet to share Nano network data.

### pending

A transaction state where a block sending funds was published and confirmed by the network, but a matching block receiving those funds has not yet been confirmed.

### principal representative (PR)

A Nano account with >= 0.1% of the online voting weight delegated to it. When configured on a voting node, the votes it produces will be rebroadcast by peers who receive them, which helps the network reach consensus more quickly.

### private key

A randomly generated secret that is used to establish accounts. See <a href="https://en.wikipedia.org/wiki/Public-key_cryptography" target="_blank">public-key cryptography</a>.

### proof-of-stake for quality-of-service (PoS4QoS, P4Q)

The idea that your stake (i.e. your balance) is used to provide a base <a href="https://en.wikipedia.org/wiki/Quality_of_service" target="_blank">quality of service.</a>

### proof-of-work (PoW)

A Proof-of-Work is a piece of data which satisfies certain requirements and is difficult (costly, time-consuming) to produce, but easy for others to verify. In some systems this data is a central part of the security model used to protect against double-spends and other types of attacks, but with Nano it is only used to increase economic costs of spamming the network.

### protocol version

The version used to identify the set of protocol rules nodes are required to follow in order to properly communicate with peers. Nodes running older protocol versions are periodically de-peered on the network to keep communication efficient.

### public key

A public key is derived from a private key using the ED25519 elliptic curve algorithm. An address is a representation of the public key, see account for more info.

### quorum

When the delta between the two successive blocks of a root is > 67% of the online voting weight.

### representative (rep)

The recipient of a Nano account's delegated vote weight. Also used to describe a Nano account with > 0 voting weight, but < 0.1% of the online voting weight, delegated to it. Unlike Principal Representatives, when configured on a voting node, the votes it produces will be ignored by peers and will not be rebroadcast.

### root

The account if the block is the first block on the account, otherwise it is the previous hash included in the block.

### seed

A 256-bit random value usually represented to the user as a 64 character hexadecimal (0-9 and A-F) value. Private keys are deterministically derived from a seed.

### time-as-a-currency (TaaC)

The idea that time is a resource that can be gained and used. It is applied in transaction prioritization such that you gain priority as time passes. Thus, accumulated time can be spent to gain priority over other transactions that have "less time".

### transactions per second (TPS)

Historically, TPS was a per-node measurement that represented a node's perception of the rate of transactions on the network (BPS). This measurement was found to be inaccurate due to peering and propagation differences between nodes, so CPS is now the preferred term for describing overall Nano network scalability. It's also important to note that while Nano sends do not require a corresponding receive to be confirmed, a receive block must be confirmed before received funds can be sent again (see pending).

### unchecked blocks

Blocks (transactions) that have been downloaded but not yet processed by the Nano node. The node software downloads all blocks from other nodes as unchecked, processes them and adds to block count, confirms the frontier blocks for each account, and then marks them as cemented.

### unopened account

An account address that does not have a first block on it (which must be a block to receive Nano sent from another account, cannot be a block only changing the Representative).

### vote-by-hash

Allows representatives to only include the hash of a block in each vote to save bandwidth. Before vote-by-hash was activated the entire block contents were required.

### voting

Each node configured with a Representative votes on every block by appending their Representative signature and a sequence number to the hash. These will be sent out to directly connected peers and if the vote originates from a Principal Representative, it will subsequently be rebroadcasted by nodes to their peers.

### voting weight

The amount of weight delegated to a Representative.

### wallet

A wallet is an organizational object in a nano_node that holds a single seed from which multiple accounts are deterministically derived via a 32-bit unsigned integer index starting at 0. Private keys are derived from the seed and index as follows: (|| means concatenation; blake2b is a highly optimized cryptographic hash function)

### WALLET_ID

A 256-bit random value name/identifier for a specific wallet in the local nano_node database. The `WALLET_ID` is not stored anywhere in the network and is only used in the local nano_node. Even though a `WALLET_ID` looks identical to a seed, do not confuse the `WALLET_ID` with a seed; funds cannot be restored with a `WALLET_ID`. Do not backup the WALLET_ID as a means to backup funds.

### work peers

Node peers which are configured to generate work for transactions at the originating nodes request.
