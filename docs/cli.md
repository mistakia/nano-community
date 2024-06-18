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

This will generate a new signing key and output the public and private keys in the console. Take care to securely store the private key.

This new signing key can now be used in place of your account key. Make sure to replace the `NC_CLI_NANO_PRIVATE_KEY` environment variable with the newly generated private key of the signing key.

#### Revoking a signing key

To revoke a signing key, use the `revoke-signing-key` command. The signing key can be revoked by either the signing key or the account key.

```bash
nano-community revoke-signing-key
```

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
nano-community update-block-meta
```

Supported metadata fields:

- note
