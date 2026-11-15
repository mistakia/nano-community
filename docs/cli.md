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

The CLI needs Node.js 20.19 or later. From 0.7.0 it has no dependencies: installing it fetches only its own files, and it signs with code it carries. Every version is published from this repository's GitHub workflow with npm provenance, which links the package to the commit it was built from. `npm view nano-community-cli dist.attestations` shows it.

To run it once without installing, use `npx nano-community-cli@0.7.0 <command>`.

### Obtaining your account private key

The CLI signs with the 32-byte private key of a nano account, as 64 hex characters. Wallets usually show a seed or a mnemonic rather than an account private key. A seed and an account index derive the private key, as described in the nano documentation's [key management guide](https://docs.nano.org/integration-guides/key-management/#backing-up-seed). Back up the seed before you export any key from it.

Use the account private key once, to link a signing key, and use the signing key for everything after that.

### Setting Environment Variables (optional)

The CLI prompts for the private key if it is not set as an environment variable, and does not show what you type. This is the safest way: the key is not stored in your command history or in a file. The CLI never takes the key as an argument, never writes it to disk and never prints it.

If you prefer the environment variable, set it for a single command or a single session. Either may store the key in your command history. Do not save it in a shell startup file such as `.bashrc`, where it sits in plain text. The CLI removes the variable from its own environment once it has read it.

#### Setting the environment variable for a single command

You can set the environment variable for a single command by putting it before the command.

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

## Usage

### Setting up a signing key (optional)

The purpose of a signing key is to sign messages to manage metadata related to a nano account/representative or block while minimizing the exposure of the account private key. This is optional but recommended.

```bash
nano-community add-signing-key
```

Run it with the account private key. The CLI generates a new signing key and links it to the account. Linking takes both keys' consent: the account signs a message naming the new key, and the new key signs a message naming the account. The CLI prints the new key's public and private keys. Store the private key securely.

This new signing key can now be used in place of your account key. Replace the `NC_CLI_NANO_PRIVATE_KEY` environment variable with the signing key's private key. Messages it signs apply to the linked account.

A key can be linked only once. A key that was ever linked, to any account and whether or not it was later revoked, is refused with "key previously linked; generate a new key". Run `add-signing-key` again to get a new one.

#### Re-linking after the CLI 0.1.0 update

Signing keys linked before the CLI 0.1.0 release were revoked when the update was deployed, because the old link signature did not bind the key it linked. If you had a signing key, run `add-signing-key` again with the account private key to link a new one. The old key cannot be linked again.

#### Revoking a signing key

To revoke a signing key, use the `revoke-signing-key` command with the public key of the signing key. Either the signing key itself or the account key can sign the revocation.

```bash
nano-community revoke-signing-key <linked_public_key>
```

The CLI asks you to confirm and shows the key that will be revoked.

### How messages are signed

Every command signs a [canonical Nano signed message](https://github.com/mistakia/nano-signed-message/blob/main/SPECIFICATION.md) for the domain `nano.community`. The signature binds the action, every field you entered, the signing account, the time and a one-time nonce. The API accepts a message only within ten minutes of its signing time, so the clock on your computer needs to be roughly right.

Before a command sends anything, it prints the exact message it will sign and the address it will send it to, and asks `Sign and send?`. Only `y` or `yes` signs; anything else sends nothing. Messages go to `https://nano.community`. The `NC_CLI_API_URL` environment variable changes that, for testing against a local server. The CLI warns whenever it is set to anything else, and refuses a value that is not an `https` address or an `http` address on `localhost`.

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
- discord_user_id — the numeric id of your Discord account, shown by Copy User ID in Discord once Developer Mode is on. It keeps your representative linked to your account when you change your username.
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

You can set a public note for a nano block using the `update-block-meta` command. The note shows on the block's page on nano.community.

```bash
nano-community update-block-meta <block_hash>
```

Supported metadata fields:

- note — plain text up to 500 characters. Line breaks are kept, other control characters are removed, and a longer note is rejected rather than shortened. An empty note clears the block's note.

The block must be confirmed and published by your account, or by the account your signing key is linked to. Otherwise the message is rejected and nothing is stored. When several notes are signed for one block, the one with the latest signing time is shown.

### Submitting a Representative Power Reading

A representative operator can sign a measured power reading with the `update-representative-power-reading` command. It needs CLI 0.5.0 or later. The reading feeds the energy figure on the homepage, as described in [Network Energy Usage](/network-energy-usage).

```bash
nano-community update-representative-power-reading
```

Sign with a signing key linked to the representative account, not the account private key. The account must be a representative known to nano.community, or the reading is rejected and nothing is stored.

Supported fields:

- energy_watt_hours — the energy the whole host used over the window, in whole watt-hours. Take it as the difference between two readings of a cumulative energy counter.
- measurement_method — `wall_meter` for a meter between the wall and the host's power supply, or `baseboard_management_controller` for the host's own power sensor through IPMI or Redfish.
- measurement_started_at and measurement_ended_at — when the window began and ended, as ISO 8601 datetimes such as `2026-11-13T00:00:00Z`. The window must be at least 24 hours and must end before you sign. The CLI sends both as epoch seconds.

The reading whose window ends latest is your current one, and every reading you sign is kept. To correct a reading, sign one over a later window.

### Reporting Representative Hardware

A representative operator can sign the details of the host the node runs on with the `report-representative-hardware` command. It needs CLI 0.6.0 or later and a Linux host. The site estimates the representative's power from the report, as described in [Network Energy Usage](/network-energy-usage).

```bash
nano-community report-representative-hardware
```

Run it on the host that runs the node, signed with a key linked to the representative account. It only reads files, under `/proc` and `/sys` and the container marker files, and runs no other program. It reads the following, shows them, and sends nothing until you confirm:

- cpu_model — the CPU name from `/proc/cpuinfo`
- logical_cpus and memory_bytes — the host's logical CPUs and memory
- storage — each physical disk, as `ssd` or `hdd` with its size, from `/sys/block`
- virtualization — the container or hypervisor the host runs in, named as `systemd-detect-virt` names it. It is `none` on bare metal, and `unknown` on a non-x86 host that shows no sign either way.
- cpu_utilization_basis_points and utilization_window_seconds — the host's average CPU use since boot, from `/proc/stat`, in hundredths of a percent, and the uptime it covers. The host must have been up at least 24 hours.
- node_cpu_utilization_basis_points — the `nano_node` process's average share of the host's CPU since it started, or null if no node process is found

The latest report is current. Run it again after any hardware change or move to another host. A measured reading from `update-representative-power-reading` takes precedence over the estimate.
