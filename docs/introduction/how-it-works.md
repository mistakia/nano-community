---
title: How it works
description: Basics about Nano's ledger and consensus design
tags: nano, xno, crypto, block, lattice, ORV, consensus, how, design, works, does
---

# How it works

Nano is a <a href="https://en.wikipedia.org/wiki/Decentralized_computing#Peer-to-peer" target="_blank">decentralized protocol</a> run by node operators, services, and users. A decentralized protocol is a set of rules and standards that allows for a network of computers to communicate and collectively manage a distributed ledger without having to trust one another.

### What is a distributed ledger?

The concept of a distributed ledger is the starting point to understanding digital money like Nano. Ledgers in cryptocurrencies are an open, global, and append-only list of operations that describe the state of the system. Operations can only be added but not removed, modified, or reordered. To know the current state of the ledger, you go through the full list of operations (first to last). Most cryptocurrencies use a structure called a <a href="https://en.wikipedia.org/wiki/Blockchain" target="_blank">blockchain</a> for their ledger. In short, new operations are grouped in "a block" and linked to the previous group of operations. Nano introduces a different structure called a block-lattice. Instead of operations for all accounts being grouped in a single block, each account has its own "blockchain", where each operation is a single block that links to the previous operation for that account.

<figure>
    <img alt='Nano uses a block lattice structure for its distributed ledger' src='/resources/account-chains.svg' />
    <figcaption>In a block-lattice, each account has its own blockchain containing the account’s balance history.</figcaption>
</figure>

<a href="https://docs.nano.org/protocol-design/ledger/" target="_blank">Learn more about Nano's block lattice.</a>

### Accounts & Ownership

Cryptocurrencies use the magic of <a href="https://en.wikipedia.org/wiki/Public-key_cryptography" target="_blank">public-key cryptography</a> to establish & secure accounts. To create a Nano account, users generate a random secret key, a computation done in a split second. The corresponding public key is used for the nano address. Computing the secret key of a given nano address is practically unfeasible. This allows users to share their nano address without compromising their secret key.

#### secret key

```
3BFA2A120BC1190DA0DE79022C56AFBC334767B12E7AB84724A45D52BE390995
```

#### public key

```
B6DFC31DA8A600B0D5C497CAEABC9BEAEA75DE47636DB4A9E52E526727069B47
```

#### nano address

```
nano_3fpzregtjbi1p5cwb7ycxcybqtqcgqh6grufpknycdkkewmif8t985zb3yta
```

To update an account, you must know the corresponding secret key. Users update their accounts by broadcasting an operation (i.e. send, receive, change rep) to the network with a <a href="https://en.wikipedia.org/wiki/Digital_signature" target="_blank">digital signature</a>, proving that they possess the secret key. These operations are then processed by the network and appended to their account in the ledger.

### Consensus & Confirmations

Distributed ledgers will inevitably have disagreements over the order of operations, referred to as <a href="https://en.wikipedia.org/wiki/Fork_(blockchain)" target="_blank">forks</a>. A decentralized & trustless process is needed to ensure that the network reaches consensus on the order of operations and the path forward. With blockchains, forks could be because of an adversary trying to disrupt the ledger's operation or simply because of network latency when two blocks are generated near-simultaneously by different nodes unaware of each other's blocks. Due to Nano's block-lattice ledger design, forks in Nano can only be created by the owner of an account and only impact their account. Unlike other cryptocurrencies that group operations from multiple accounts into a single block, Nano can more easily resolve forks without affecting other accounts.

Nano capitalizes on the advantages of its ledger design with a consensus mechanism called Open Representative Voting (ORV).

A node configured to broadcast votes is called a Representative. Every account can freely choose a Representative at any time to vote on their behalf. A Representative's voting weight is the sum of balances for accounts delegating to them.

Nodes then observe votes for each block, once they see a block get enough votes to reach quorum, that block is confirmed. This means that a balance-weighted majority of Representatives have observed this block, added it to their ledgers, and voted for it.

Due to the lightweight nature of blocks and votes, the network can reach confirmation for transaction ultrafast, often in under a second.

<a href="https://docs.nano.org/protocol-design/orv-consensus/" target="_blank">Learn more about Open Representative Voting</a>

<a href="https://docs.nano.org/protocol-design/introduction/" target="_blank">Learn more about the Protocol Design</a>

[Overview of the design](/design/basics)
