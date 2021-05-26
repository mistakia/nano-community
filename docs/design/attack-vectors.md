---
title: Attack vectors
description: Nano attack vectors
tags: nano, attack, vectors, vulnerability, issues
---

# Attack Vectors

### Block gap synchronization

| Attack | Block gap synchronization |
|  --- | --- |
| Risk | Low |
| Impacts | Network amplify, denial of service |
| Defense Status | Implemented |

#### Description

Each block has a link to its previous block. If a new block arrives where we can't find the previous block, this leaves the node deciding whether it's out of sync or if someone is sending junk data. If a node is out of sync, synchronizing involves a TCP connection to a node that offers bootstrapping which is much more traffic than sending a single UDP packet containing a block; this is a network amplification attack.

#### Defense

For blocks with no previous link, nodes will wait until a certain threshold of votes have been observed before initiating a connection to a bootstrap node to synchronize. If a block doesn't receive enough votes it can be assumed to be junk data.

### Transaction flooding

| Attack | Transaction flooding |
|  --- | --- |
| Risk | Low |
| Impacts | High I/O, Confirmation Congestion |
| Defense Status | Partially Implemented |

#### Description

Transaction flooding is simply sending as many valid transactions as possible in order to saturate the network. Usually an attacker will send transactions to other accounts they control so it can be continued indefinitely.

#### Defense

Block confirmations are prioritized based on the balance of the block and the last time the account broadcasted a block. Thus, saturating the active election container requires possession of a large amount of the supply. Additionally, each block has a small amount of work associated with it, around 5 seconds to generate and 1 microsecond to validate. This work difference causes an attacker to dedicate a large amount to sustain an attack while wasting a small amount of resources by everyone else. Nodes that are not full historical nodes are able to prune old transactions from their chain, this clamps the storage usage from this type of attack for almost all users.

### Sybil attack to change ledger entries

| Attack | Sybil attack to change ledger entries |
|  --- | --- |
| Risk | None |
| Impacts | Completely destructive |
| Defense Status | Partially Implemented |

#### Description

A Sybil attack is a person creating a lot of nodes on the network, possibly thousands on a single machine, in order to get a disproportionate vote on networks where each node gets an equal vote.

#### Defense

The Nano voting system is weighted based on account balance. Adding extra nodes in to the network will not gain an attacker extra votes.

### Penny-spend attack

| Attack | Penny-spend attack |
|  --- | --- |
| Risk | Low |
| Impacts | Completely destructive |
| Defense Status | Partially Implemented |

#### Description

A penny-spend attack is where an attacker spends infinitesimal quantities to a large number of accounts in order to waste the storage resources of nodes.

#### Defense

Blocks publishing is rate-limited by work so this limits accounts to a certain extent. Nodes that are not full historical nodes can prune accounts below a statistical metric where the account is probably not a valid account. Finally, Nano is tuned to use minimal permanent storage space so space required to store one additional account is proportional to the size of one block + indexing ~ 96b + 32b ~ 128b. This equates to 1GB being able to store 8 million penny-spend account. If nodes want to be aggressive, they can calculate a distribution based on access frequency and delegate infrequently used accounts to slower storage.

### Double Spend

| Attack | Double Spend |
|  --- | --- |
| Risk | Low |
| Impacts | Partially destructive |
| Defense Status | Partially Implemented |

#### Description

The metric of consensus for Nano is a balance weighted voting system. If an attacker is able to gain over 67% of the voting strength, they could stall the network or confirm competing forks by oscillating their voting decisions. An attacker is able to lower the voting weight needed through a network DDOS attack to lower the number of online voting nodes.

#### Defense

There are multiple levels of defense against this type of attack:

- Primary defense: voting weight being tied to investment in the system; attempting to flip the ledger would be destructive to the system as a whole which would destroy their investment.

- Secondary defense: cost of this attack is proportional to the market cap of all of Nano. The cost of attacking the system scales with the system and if an attack were to be successful the cost of the attack can't be recovered.

- Forks in Nano are never accidental so nodes can make policy decisions on how to interact with forked blocks. The only time non-attacker accounts are vulnerable to block forks is if they receive a balance from an attacking account. Accounts wanting to be secure from block forks can wait a little or a lot longer before receiving from an account who generated forks or opt to never receive at all. Receivers could also generate separate accounts for receiving from dubious accounts in order to protect the rest of their balance.

- A final line of defense is block cementing. As blocks are confirmed in V19.0+, the node marks the height of the last block confirmed for every account and will refuse the replacement of an already confirmed block. Attempts to fork after previous confirmation of a block will immediately fail.

### Stall or Censor Txs

| Attack | Stall or Censor Txs |
|  --- | --- |
| Risk | Low |
| Impacts | Censorship, Stalled Confirmations |
| Defense Status | Partially Implemented |

#### Description

Nano uses a balance weighted voting system to confirm transactions. Nodes wait to observe a delta of 67% of the online voting weight in support of a block before they consider it confirmed. If an attacker is able to gain 33% of the online voting weight, they could stall and censor confirmations simply by not voting.

#### Defense

Voting weight is derived from an account balance, making it tied to ones investment in the system. Stakeholders are incentivized to safeguard their voting weight

### Bootstrap poisoning

| Attack | Bootstrap poisoning |
|  --- | --- |
| Risk | None/Low |
| Impacts | New-node denial of service |
| Defense Status | Partially Implemented |

#### Description

The longer an attacker is able to hold an old private key with a balance, the higher the probability of balances that existed at that time no longer having representatives that are participating in voting because their balances or representatives have transferred to new people. This means if a node is bootstrapped to an old representation of the network where the attacker has a quorum of voting stake compare to representatives at that point in time, they would be able to oscillate voting decisions to that node. If this new user wanted to interact with anyone besides the attacking node all of their transactions would be denied since they have different head blocks. The net result is nodes can waste the time of new nodes in the network by feeding them bad information.

#### Defense

Nodes can be paired with an initial database of accounts and known-good block heads; this is a replacement for downloading the database all the way back to the genesis block. The closer the download is to be current, the higher the probability of accurately defending against this attack. In the end this attack is probably no worse than feeding junk data to nodes while bootstrapping since they wouldn't be able to transact with anyone who has a contemporary database.
