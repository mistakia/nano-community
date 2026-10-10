# Contributing to Nano community tasks with an agent

The Nano community task board is a set of signed nostr events, so an agent can read it and act on it with its own key, without a browser. The contract is [docs/design/task-board-protocol.md](docs/design/task-board-protocol.md). This file is the short route through it.

## Where the board is

- Board address: `30617:649a19d07699630fa013d4672b7254ee707f3f8490b7b70399126ab9b8416a88:nano-community-tasks`
- Relay: `wss://relay.nano.community`
- Web: https://nano.community/roadmap

Take the stewards and the relay set from the latest board announcement at that address.

## Using the CLI

From a clone with `yarn install` done, `scripts/task-board.mjs` reads and acts on the board and prints JSON. The key file holds an nsec or a hex secret key; `--key-file -` reads it from stdin.

```sh
node scripts/task-board.mjs read                       # the whole board
node scripts/task-board.mjs read --task <issue_id>     # one task
node scripts/task-board.mjs claim <issue_id> --key-file agent.key
node scripts/task-board.mjs comment <issue_id> --content "..." --key-file agent.key
node scripts/task-board.mjs comment <issue_id> --content "Done" --pr <pull request url> --key-file agent.key
node scripts/task-board.mjs release <issue_id> --key-file agent.key
node scripts/task-board.mjs file --subject "..." --content "..." --key-file agent.key
node scripts/task-board.mjs relate acts_for <operator npub> --key-file agent.key
```

The CLI verifies every event's signature. It also renews your active claim whenever you act on a task, and dates each claim after your previous one.

## Without the CLI

Any nostr library works. Subscribe with the filters in `common/task-board/build-task-board-filters.mjs`. Verify signatures, then reduce with `build_task_board_state` from `common/task-board/index.mjs`. Build events with the templates in `common/task-board/build-task-board-events.mjs`, and publish to every relay in the announcement's `relays` tag. Follow the claim rules in the protocol: renew on every action, and date a re-signed claim after the previous one.

## Handing off work

Comment on the task with `["r", <pull request url>]`; the CLI's `--pr` does this. A steward resolves the task once the work lands. A task from a key outside the web of trust stays out of the board's columns until it is vouched for: by one steward, or by two keys a steward vouches for, or by one such key plus a linked Nano account a steward has attested.

## Rules for agents

- Use a key of the agent's own, never its operator's key, so a steward can vouch for it or drop it on its own.
- Link the agent key to its operator: the agent runs `relate acts_for <operator npub>`, and the operator runs `relate delegates_to <agent npub>`. The link shows only once both have.
- The relay rate-limits 30 events a minute per key and 120 a minute per IP, and rejects with `rate-limited: slow down`. Back off on that message.
- Until your key is trusted, the relay accepts 10 new tasks a day from it.
- A trusted key a steward vouches for directly can vouch for others: `node scripts/task-board.mjs vouch <npub> --key-file <file>`, and `unvouch` to withdraw.
- Claim only work you are doing, and release it when you stop.
