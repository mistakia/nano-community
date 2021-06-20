---
title: Protocol design
description: Nano protocol design information & whitepapers
tags: nano, protocol, crypto, digital, money, whitepaper, design
---

# Design

For a general overview for those new to the topic of digital money, start with a brief overview of <a href="/introduction/how-it-works">how it works</a>.

For more technical details of the protocol and node design, review details about the [reference implementation](/getting-started-devs/protocol-reference), the <a href="https://docs.nano.org/what-is-nano/living-whitepaper/" target="_blank">Living Whitepaper</a> or the published whitepapers

- <a href="https://github.com/mistakia/nano-community/blob/main/resources/nano-whitepaper.pdf" target="_blank">Nano Whitepaper</a>
- <a href="https://github.com/mistakia/nano-community/blob/main/resources/raiblocks-whitepaper.pdf" target="_blank">Original RaiBlocks Whitepaper</a>

<small>_Note: the published whitepapers are outdated_</small>

### Overview

Nano uses a block-lattice data structure, where every account has its own blockchain (account-chain). It is the first cryptocurrency created on a directed acyclic graph (DAG), where a "block" is just one transaction, and each transaction contains the account's current balance.

Consensus is reached through an algorithm similar to proof of stake named Open Representative Voting (ORV). In this system, the voting weight is distributed to accounts based on the amount of NANO they hold: accounts then freely delegate this weight to a node of their choice. In the event that two contradictory transactions are broadcast to the network (as in a double spend attempt), nodes vote for one of them and broadcast their vote to the other nodes. The first transaction to reach a delta of 51% of the total voting weight is confirmed, and the other discarded.

This architecture allows Nano to function without direct monetary incentives to users or validators. Because certain entities benefit from the network indirectly (cryptocurrency exchanges through trading fees, merchants avoiding the fees associated with credit card companies, etc.), there is an interest to keep it healthy and decentralized by running a node. Since there is no direct incentive to accumulate voting weight, this also helps avoid the centralizing tendencies inherent to economies of scale such as traditional proof of work and proof of stake architectures.

| Feature            | Nano                           |
| ------------------ | ------------------------------ |
| Ledger Structure   | Block-lattice                  |
| Consensus          | Open Representative Voting     |
| Hash Function      | Blake2                         |
| Signing Algo       | ED25519                        |
| Key Derivation     | Argon2                         |
| Block Size         | 216 bytes                      |
| Monetary Policy    | Fixed                          |
| Inflation          | 0%                             |
| Circulating supply | 133,248,297                    |
| Total Supply       | 133,248,297                    |
| Scalability        | Dynamic (hardware & bandwidth) |
| Scalability Limit  | Unknown                        |
| Fees               | No Fees                        |
| Tx Prioritization  | Balance, Time since Use        |
| Distribution       | Given away via Captcha Faucet  |
