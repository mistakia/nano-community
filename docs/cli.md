---
title: Nano.Community CLI
description: Documentation for the Nano.Community CLI
tags: nano, xno, cli, nano-community, alias, representative, metadata, signing key
---

# Nano.Community CLI

## Installation

The Nano.Community CLI is available as a global npm package. You'll need to have [Node.js installed](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm) to use it.

```bash
npm install -g nano-community
```

It is also available as a yarn global package.

```bash
yarn global add nano-community
```

### Setting Environment Variables

The best way to pass the private key to the CLI is to set the `NC_CLI_NANO_PRIVATE_KEY` environment variable.

**Linux/Mac:**

```bash
export NC_CLI_NANO_PRIVATE_KEY='your_private_key_here'
```

**Windows:**

```cmd
set NC_CLI_NANO_PRIVATE_KEY=your_private_key_here
```

## Usage

### Setting up a signing key (optional)

The purpose of a signing key is to sign messages to manage metadata related to a nano account/representative or block while minimizing the exposure of the account private key. This is optional but recommended.

```bash
nano-cli add-signing-key
```

This will generate a new signing key and output the public and private keys in the console. Take care to securely store the private key.

This new signing key can now be used in place of your account key. Make sure to replace the `NC_CLI_NANO_PRIVATE_KEY` environment variable with the newly generated private key of the signing key.

#### Revoking a signing key

To revoke a signing key, use the `revoke-signing-key` command. The signing key can be revoked by either the signing key or the account key.

```bash
nano-cli revoke-signing-key
```

### Updating Nano Representative Metadata

To update the metadata for a Nano representative use the `update-rep-meta` command.

1. Run the command:
   ```bash
   nano-cli update-rep-meta
   ```
2. You will be prompted to enter various metadata fields such as alias, description, donation address, etc. Fill these out as required.
3. Review the entered data when prompted, and confirm to proceed.
4. The CLI will sign and send the metadata update to the nano.community API, confirming the request in the console output.

### Updating Nano Account Metadata

You can set a public alias for a nano account using the `update-account-meta` command.

```bash
nano-cli update-account-meta
```

### Updating Nano Block Metadata

You can set a public message for a nano block using the `update-block-meta` command.

```bash
nano-cli update-block-meta
```
