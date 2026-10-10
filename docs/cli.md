---
title: Nano.Community CLI
description: Documentation for the Nano.Community CLI
tags: nano, xno, cli, nano-community, alias, representative, metadata, signing key
---

# Nano.Community CLI

## Installation

The Nano.Community CLI is available as a global npm package. You'll need to have [Node.js installed](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm) to use it.

```bash
npm install -g nano-community-cli
```

It is also available as a yarn global package.

```bash
yarn global add nano-community-cli
```

Version 0.1.0 or later is required. Earlier versions sign in a format the API no longer accepts.

### Obtaining your account private key

The CLI signs with the 32-byte private key of a nano account, as 64 hex characters. Wallets usually show a seed or a mnemonic rather than an account private key. A seed and an account index derive the private key, as described in the nano documentation's [key management guide](https://docs.nano.org/integration-guides/key-management/#backing-up-seed). Back up the seed before you export any key from it.

Use the account private key once, to link a signing key, and use the signing key for everything after that.

### Setting Environment Variables (optional)

The CLI will prompt you for the private key if it is not already set as an environment variable. Using the CLI in this way is simple and secure, as the private key will neither be stored in command history nor saved to a file.

If you prefer setting the environment variable, you have three options:

- **For a single command:** Use this method for one-time CLI calls. Note that using this in the terminal may store the private key in your command history, so it's better suited for programmatic use.
- **For a single session:** This temporarily sets the private key for the duration of the terminal session. Be aware that the key may still be recorded in your command history.
- **For all sessions:** This method saves the private key in a file within your home directory, ensuring it's available for all sessions.

Choose the method that best suits your security and convenience needs.

#### Setting the environment variable for a single command

You can set the environment variable for a single command by passing it as an argument.

```bash
NC_CLI_NANO_PRIVATE_KEY='<private_key>' nano-community update-rep-meta
```

#### Setting the environment variable for a single session

##### Linux/Mac:

```bash
export NC_CLI_NANO_PRIVATE_KEY='<private_key>'
```

##### Windows:

```cmd
set NC_CLI_NANO_PRIVATE_KEY=<private_key>
```

This will persist for the duration of the current session in the terminal. You can now run commands without having to set the environment variable for each command.

#### Setting the environment variable for all sessions

You can persist the environment variable for all sessions by adding it to your `.bashrc`, `.zshrc`, or `.bash_profile` file in your home directory.

## Usage

### Setting up a signing key (optional)

The purpose of a signing key is to sign messages to manage metadata related to a nano account/representative or block while minimizing the exposure of the account private key. This is optional but recommended.

```bash
nano-community add-signing-key
```

Run it with the account private key. The CLI generates a new signing key and links it to the account. Linking takes both keys' consent: the account signs a message naming the new key, and the new key signs a message naming the account. The CLI prints the new key's public and private keys. Store the private key securely.

This new signing key can now be used in place of your account key. Replace the `NC_CLI_NANO_PRIVATE_KEY` environment variable with the signing key's private key. Messages it signs apply to the linked account.

A key can be linked only once. A key that was ever linked, to any account and whether or not it was later revoked, is refused with "key previously linked; generate a new key". Run `add-signing-key` again to get a new one.

#### Re-linking after the October 2026 update

Signing keys linked before the CLI 0.1.0 release were revoked when the update was deployed, because the old link signature did not bind the key it linked. If you had a signing key, run `add-signing-key` again with the account private key to link a new one. The old key cannot be linked again.

#### Revoking a signing key

To revoke a signing key, use the `revoke-signing-key` command with the public key of the signing key. Either the signing key itself or the account key can sign the revocation.

```bash
nano-community revoke-signing-key <linked_public_key>
```

The CLI asks you to confirm and shows the key that will be revoked.

### How messages are signed

Every command signs a [canonical Nano signed message](https://github.com/mistakia/nano-signed-message/blob/main/SPECIFICATION.md) for the domain `nano.community`. The signature binds the action, every field you entered, the signing account, the time and a one-time nonce. The API accepts a message only within ten minutes of its signing time, so the clock on your computer needs to be roughly right.

### Updating Nano Representative Metadata

To update the metadata for a Nano representative use the `update-rep-meta` command.

1. Run the command:
   ```bash
   nano-community update-rep-meta
   ```
2. The CLI will prompt you for the private key if one is not set in an environment variable.
3. You will be prompted to enter various metadata fields such as alias, description, donation address, etc. Fill these out as required.
4. Review the entered data when prompted, and confirm to proceed.
5. The CLI will sign and send the metadata update to the nano.community API, confirming the request in the console output.

Supported metadata fields:

- alias
- description
- donation_address
- cpu_model
- cpu_cores
- ram
- reddit
- twitter
- discord
- github
- email
- website

### Updating Nano Account Metadata

You can set a public alias for a nano account using the `update-account-meta` command.

```bash
nano-community update-account-meta
```

Supported metadata fields:

- alias

### Updating Nano Block Metadata

You can set a public message for a nano block using the `update-block-meta` command.

```bash
nano-community update-block-meta <block_hash>
```

Supported metadata fields:

- note
