---
title: Attack vectors
description: A brief look at various attack vectors and ways to compromise or degrade the Nano network
tags: nano, attack, vectors, vulnerability, issues, weakness
---

# Attack Vectors

### Transaction flooding

| Attack         | Transaction flooding              |
| -------------- | --------------------------------- |
| Risk           | Low                               |
| Impacts        | High I/O, Confirmation Congestion |
| Defense Status | Partially Implemented             |

#### Description

Transaction flooding is simply sending as many valid transactions as possible in order to saturate the network. Usually an attacker will send transactions to other accounts they control so it can be continued indefinitely.

#### Defense

Block confirmations are prioritized based on the balance of the block and the last time the account was used. This makes congesting the network financially prohibitive (i.e. you need 50% of the supply to consume 50% of the throughput).

Additionally, each block has a small amount of work associated with it, around 5 seconds to generate and 1 microsecond to validate. This work difference causes an attacker to dedicate a large amount to sustain an attack while wasting a small amount of resources by everyone else. Nodes that are not full historical nodes can prune old transactions from their chain, this clamps the storage usage from this type of attack for almost all users.

### Penny-spend attack

| Attack         | Penny-spend attack  |
| -------------- | ------------------- |
| Risk           | Low                 |
| Impacts        | Storage space usage |
| Defense Status | Not Implemented     |

#### Description

A penny-spend attack is where an attacker spends infinitesimal quantities to a large number of accounts in order to waste the storage resources of nodes.

#### Defense

Blocks publishing is rate-limited by work so this limits accounts to a certain extent. The addition of a <a href="https://forum.nano.org/t/bounded-block-backlog/1559" target="_blank">bounded backlog</a> in conjunction with a bandwidth limit could further rate-limit (or reject) a penny-spend attack.

Nodes that are not full historical nodes can prune accounts below a statistical metric where the account is probably not a valid account. Finally, Nano is tuned to use minimal permanent storage space so space required to store one additional account is proportional to the size of one block + indexing ~ 96b + 32b ~ 128b. This equates to 1GB being able to store 8 million penny-spend account.

If nodes want to be aggressive, they can calculate a distribution based on access frequency and delegate infrequently used accounts to slower storage.

### Block gap synchronization

| Attack         | Block gap synchronization          |
| -------------- | ---------------------------------- |
| Risk           | Low                                |
| Impacts        | Network amplify, denial of service |
| Defense Status | Implemented                        |

#### Description

Each block has a link to its previous block. If a new block arrives where we can't find the previous block, this leaves the node deciding whether it's out of sync or if someone is sending junk data. If a node is out of sync, synchronizing involves a TCP connection to a node that offers bootstrapping which is much more traffic than sending a single UDP packet containing a block; this is a network amplification attack.

#### Defense

For blocks with no previous link, nodes will wait until a certain threshold of votes have been observed before initiating a connection to a bootstrap node to synchronize. If a block doesn't receive enough votes it can be assumed to be junk data.
