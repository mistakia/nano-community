---
title: Storing Nano
description: How to use and store Nano
tags: nano, xno, wallet, crypto, custody, cold, seed, address, security
---

# Storing

It's important to understand the difference between self-custody and custodial as it has major implications for yourself and the network.

## Self-custody vs Custodial

You can store and control Nano (XNO) directly (self-custody) or you can give it to another entity (custodian) to control it for you.

The decision is mostly one of responsibility and control with implications for the security and value of the network.

With self-custody, you have full control and with it comes full responsibility. Whereas with custodial services, you have limited control and limited responsibility.

#### Custodial Implications

- **trust:** that your funds are secured, insured, available, not given away
- **risk:** higher risk exposure and attack surface
- **privacy / kyc:** in some cases, you may relinquish control over your identity, transaction history, etc
- **security of funds:** custodians are prime targets for theft
- **accessibility:** custodial services may experience downtime
- **network security / control:** lose control over your nano voting weight and how its delegated
- **network value:** leaving funds on an exchange may contribute to centralization which lowers the value of the network. Additionally, it provides liquidity for shorting.

<small>_Note: over time, adoption of approaches like <a href="https://nanojson.medium.com/how-to-use-nano-multisig-33c8865ef8b1" target="_blank">multi-signature</a> can allow for a blend between self-custody and custodial control over a nano account_</small>

## Self-custody

Determining the right self-custody approach depends on how you intend to use it. Thus, no single approach to storing Nano will be ideal for all scenarios.

First, it is important to understand a few concepts

### What is an account?

An account is simply a randomly generated secret key. The account address is derived from this key and can be safely shared with others without compromising the secret key

#### secret key

```
3BFA2A120BC1190DA0DE79022C56AFBC334767B12E7AB84724A45D52BE390995
```

#### nano address

```
nano_3fpzregtjbi1p5cwb7ycxcybqtqcgqh6grufpknycdkkewmif8t985zb3yta
```

### What is a seed?

A seed is a randomly generated secret that can then be used to predictably generate up to 4,294,967,295 secret keys. Secret keys are derived deterministically from the seed, which means that as long as you put the same seed and index into the derivation function, you will get the same resulting secret key every time.

This enables you to back up one seed instead of many secret keys.

#### nano seed

```
6D2247D1CE17C116CD0C5E0C6AC08B9DD57889026E18320EAFA2F0D699D6BD04
```

### What is a wallet?

A wallet is an application that handles your secret key to help send signed messages to the network to manage your account. It helps you send/receive transactions and change your representative.

In other words, a wallet is just a messenger, it does not actually "hold" your funds. Your funds are on the distributed ledger maintained by the entire network. The secret key is the only thing that controls it. You can change wallets or delete them without losing your funds so long as you still possess the secret key.

It is important to carefully choose the wallet you use, as it has your secret key, and with it comes full control of your account.

Before you begin storing and using Nano, understand these <a href="/getting-started-users/basics">basic</a> facts.

#### Considerations

- amount of value
- frequency of access

#### Types

- Software Wallets
  - online
  - mobile
  - desktop
  - command line
- Paper
  - metal
  - password manager
- Hardware

Paper wallets can provide a higher level of security but can not support frequent use, making them an ideal choice for long-term storage of large amounts of value.

The ideal choice for frequent use is software wallets: desktop, mobile, online (from most to least secure).

Hardware wallets are somewhere in between paper wallets and software wallets in terms of security.

Get started by [setting up an account](/getting-started-users/storing/setup)
