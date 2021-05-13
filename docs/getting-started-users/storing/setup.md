---
title: Setup Wallet & Account
description: How to create a nano account and wallet
tags: nano, wallet, account, crypto, setup, create, use, address, seed, secure, instructions
---

# Setting up an Account

Before you get started make sure to understand some basic facts about [Nano](/getting-started-users/basics) and [storing it](/getting-started-users/storing/basics).

| Usage             | Wallet Approach                         |
| ----------------- | --------------------------------------- |
| Long-term storage | Paper or hardware wallet                |
| Active usage      | Software wallet, backed by paper wallet |
| Giving away       | Paper wallet                            |

## Setup a password manager

Regardless of what wallet you use, it is good practice to have it backed up. Using a password manager to backup your seeds and secret keys provides the best mix of convenience, security, and durability.

You should be using a password manager for other reasons anyways.

### Setup KeePassXC

Feel free to use whatever password manager you would like. KeePassXC is a good starter recommendation for the following reasons:

- open source
- free
- offline
- strong encryption
- cross platform

<a href="https://keepassxc.org/" target="_blank">Download KeePassXC</a>

#### Master password selection

You should generate a random password or use a <a href="https://www.useapassphrase.com/" target="_blank">passphrase</a>.

#### Backup password manager file

Since it is offline, you have full control over how and where you store the encrypted password file (i.e. usb, cloud storage, etc). It is good practice to make multiple copies and back it up in a variety of ways.

## Generating an account

To generate an account all you need to do is generate either a random seed or secret key. Software wallets will do this for you and allow for you to export the secret seed or key.

To generate one on your own, you can download one of the following static websites and securely generate one on your local machine. These static pages run locally on your computer and so you can disconnect your computer from the internet when using them. To be extra safe you can copy the file and use it on an <a href="https://en.wikipedia.org/wiki/Air_gap_(networking)" target="_blank">"air-gapped"</a> computer.

##### Offline Generators

- Numtel (<a href="/resources/numtel-account-generator.html" download>Download</a> / <a href="https://raw.githubusercontent.com/mistakia/nano-community/main/resources/numtel-account-generator.html" target="_blank">Github</a>) — <a href="https://github.com/numtel/rai-paper-wallet/" target="_blank">Source</a>
- Nanoo.tools (<a href="/resources/nanoo-tools-account-generator.html" download>Download</a> / <a href="https://raw.githubusercontent.com/mistakia/nano-community/main/resources/nanoo-tools-account-generator.html" target="_blank">GitHub</a>) — <a href="https://nanoo.tools/light-paperwallets" target="_blank">Site</a>

<small>_Note: these generators have not been audited yet_</a>

## Software Wallets

To receive/send transactions and change your representative you will have to import your seed or secret key into a wallet.

- A recommended starter desktop wallet is <a href="https://github.com/Nault/Nault" target="_blank">Nault<a/>.
- <a href="https://natrium.io/" target="_blank">Natrium</a> is one of the more popular mobile wallets.
- <a href="https://github.com/codesoap/atto" target="_blank">Atto</a> is a simple, clean command line wallet

For a comprehensive wallet guide visit <a href="https://nanowallets.guide/" target="_blank">nanowallets.guide</a>.

It is your responsibility to properly handle and secure your secret seed or key. Make sure you understand what you are doing before you give any application or person your secret seed or key, as you are giving them full control over that account.

Follow these [best practices](/getting-started-users/best-practices).
