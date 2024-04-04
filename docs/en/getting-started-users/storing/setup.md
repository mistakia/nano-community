---
title: Setup Wallet & Account
description: How to create a nano account and wallet
tags: nano, xno, wallet, account, crypto, setup, create, use, address, seed, secure, instructions
---

# Setting up an Account

Before you get started make sure to understand some basic facts about [Nano](/getting-started-users/basics) and [storing it](/getting-started-users/storing/basics).

| Usage             | Wallet Approach                         |
| ----------------- | --------------------------------------- |
| Long-term storage | Paper or hardware wallet                |
| Active usage      | Software wallet, backed by paper wallet |
| Giving away       | Paper wallet                            |

## Setup a password manager

Regardless of what wallet you use (software or hardware), you will need to back it up with a paper wallet. Using a password manager as a paper wallet to backup your secrets provides the best mix of convenience, security, and durability.

You should be using a password manager for other reasons anyways.

### Setup KeePassXC

Feel free to use whatever password manager you would like. KeePassXC is recommended for the following reasons:

- offline & local (you manage the password file)
- open source
- free
- strong encryption
- cross platform

<a href="https://keepassxc.org/" target="_blank">Download KeePassXC</a>

#### Master password selection

You should generate a random password or use a <a href="https://www.useapassphrase.com/" target="_blank">passphrase</a>.

Make multiple local and offline backups of your master password (i.e. on a piece of paper). If you use your password manager frequently enough, you will be able to memorize this password or passphrase. Otherwise, you may have to take additional steps to ensure it is durably backed up (i.e. engraved on a piece of metal).

#### Backup password manager file

Since it is offline, you have full control over how and where you store the encrypted password file (i.e. usb, cloud storage, etc). It is good practice to make multiple copies. Since the password file is encrypted, it is fine to store copies on cloud storage providers like google drive and dropbox. A good mix would be to have multiple local copies (usb, external drives, etc) as well as multiple remote copies on various cloud storage providers.

## Generating an account

To generate an account, the best way to do it is generate a random seed. Software wallets will do this for you and allow for you to export the secret seed.

To generate one on your own, you can download one of the following static websites and securely generate one on your local machine. These static pages run locally on your computer and so you can disconnect your computer from the internet when using them. To be extra safe you can copy the file and use it on an <a href="https://en.wikipedia.org/wiki/Air_gap_(networking)" target="_blank">"air-gapped"</a> computer.

### Pages (Offline & Local)

- Numtel (<a href="/resources/numtel-account-generator.html" download>Download</a> / <a href="https://raw.githubusercontent.com/mistakia/nano-community/main/resources/numtel-account-generator.html" target="_blank">Github</a>) — <a href="https://github.com/numtel/rai-paper-wallet/" target="_blank">Source</a>
- Nanoo.tools (<a href="/resources/nanoo-tools-account-generator.html" download>Download</a> / <a href="https://raw.githubusercontent.com/mistakia/nano-community/main/resources/nanoo-tools-account-generator.html" target="_blank">GitHub</a>) — <a href="https://nanoo.tools/light-paperwallets" target="_blank">Site</a>

<small>_Note: these generators have not been audited yet_</small>

### Command Line

If you are comfortable with the command line, below are commands to generate a seed using cryptographically secure random number generators for each platform.

```bash [g1:Mac OSX]
cat /dev/urandom | LC_ALL=C tr -dc 'A-F0-9' | fold -w 64 | head -n 1
```

```bash [g1:Linux]
echo $(cat /dev/urandom | tr -dc A-F0-9 | head -c64)
```

```powershell [g1:Windows]
$randomBuffer = [byte[]](1..1); $seed = [char[]](1..64); -join($seed | foreach { Do {(new-object Security.Cryptography.RNGCryptoServiceProvider).GetBytes($randomBuffer); $randomChar = [char[]]([char]'A'..[char]'F' + [char]'0'..[char]'9')[$randomBuffer[0]]} While ($randomChar -eq $null); $randomChar })
```

```js [g1:Nodejs]
;[...Array(64)]
  .map(() =>
    (function getRandomChar() {
      return 'ABCDEF0123456789'[crypto.randomBytes(1)[0]] || getRandomChar()
    })()
  )
  .join('')
```

```js [g1:Web]
;[...Array(64)]
  .map(() =>
    (function getRandomChar() {
      return (
        'ABCDEF0123456789'[window.crypto.getRandomValues(new Uint8Array(1))] ||
        getRandomChar()
      )
    })()
  )
  .join('')
```

## Software Wallets

To receive/send transactions and change your representative you will have to import your seed or secret key into a wallet.

- Desktop: <a href="https://github.com/Nault/Nault" target="_blank">Nault</a>.
- Mobile: <a href="https://natrium.io/" target="_blank">Natrium</a>.
- Command Line: <a href="https://github.com/codesoap/atto" target="_blank">Atto</a>.

For a comprehensive wallet guide visit <a href="https://nanowallets.guide/" target="_blank">nanowallets.guide</a>.

It is your responsibility to properly handle and secure your secret seed or key. Make sure you understand what you are doing before you give any application your secret seed or key, as you are giving them full control over that account.

Follow these [best practices](/getting-started-users/best-practices).
