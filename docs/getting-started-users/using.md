# Using

Begin by understanding the [basics](/getting-started-users/basics), [acquiring](/getting-started-users/acquiring) some nano, and [storing](/getting-started-users/storing/basics) it yourself.

## Transactions

It helps to understand that a transaction has two parts.

1. **A Send Part:** The sender broadcasts an operation that deducts the balance of their account by the amount they are sending
2. **A Receive Part:** The receiver broadcasts an operation that references the sender's operation and increases the balance of their account by the amount sent to them

Each of these operations are referred to as "blocks" and have a "block hash" that identifies them. Looking up the block hash can let you know if it the network has seen it and if it has been confirmed.

You can look them up using the following block explorers

- <a href="https://nanolooker.com/" target="_blank">Nanolooker.com</a>
- <a href="https://nault.cc/" target="_blank">Nault.cc</a>

Once a send block has been confirmed by the network, the transaction is irreversible. The receiver can broadcast a receive block at any point in the future. However, until they do, they will not be able to use the amount they have received since they have not updated their balance.

Review these [best practices](/getting-started-users/best-practices) and learn how you can protect your [privacy](/getting-started-users/privacy).

## Common misconceptions & confusions

#### Confusion over the term "Pending"

Some block explorers and services refer to funds that have the send part confirmed, but lacks a receive part, as pending. This has led to a lot of <a href="https://forum.nano.org/t/replacing-pending-terminology-once-and-for-all/329" target="_blank">confusion</a> as it is easily confused with an unconfirmed send, despite it being confirmed and irreversible. The user just needs to open up their account on a wallet to broadcast the receive part, which is done automaticall by most wallets when they see that you have a confirmed send to your account.
