---
title: Security
description: A brief description of the security assurances provided by the nano network
tags: nano, security, decentralization, consensus
---

# Security

**Full Node Assurances**

- Nobody has inflated the nano supply.
  - Nobody ever spent nano they didn't have.
  - Nobody ever spent the same nano twice.
- Nobody ever spent nano without having the appropriate private key(s).

### Deterministic Finality

A transaction is irreversibly final when a quorum of votes is observed. A process that is sometimes achieved in under 250 ms. This prevents attackers from altering confirmed transactions regardless of how much voting weight they have acquired.

### Sybil resistance

The Open Representative voting system is weighted based on account balance. Adding extra nodes to the network will not gain an attacker extra votes. Thus, the nano network is resistant to sybil attacks.

### Double Spend Detection and Resolution

A double spend is detected when a node observes at least 2 different valid blocks (forks) referencing the same previous block (root). The node will then observe votes for the different blocks waiting for one of them to reach a quorum (super-majority) of votes. Once a block reaches a quorum of votes it is confirmed and any additional attempted forks are ignored.

Since blocks require a valid signature, forks can only be created by account holders. Thus forks can be considered either malicious or an error. This allows the network to quickly resolve forks by supporting whichever block is observed to have the most votes. The resulting effect is that the block that is propagated quickest to the higher weight representatives usually wins.
