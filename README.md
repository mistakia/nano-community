# Nano.Community

**Vision & Purpose**

Nano.Community aims to be a portal to Nano's growing community by maintaining docs, guides, and conventions to improve community communication & onboarding.

**Primary Goals**

- Help new members discover and understand existing ideas, discussions in an easily consumable manner
- Help existing members point new members to old ideas, discussions, conclusions, etc
- Help new member onboarding, especially for code contributions from developers

**Secondary Goals**

- Serve as a chronicle of events, discussions, comments, ideas, etc. Documenting Nano culture & history
- Keep the community at large informed — serve as a centralized place to easily and quickly track an open and distributed project
- Measure community support for or against ideas by nano account based voting

## Design

This project will serve as both a knowledge hub and an overlay / gateway to the greater Nano community & ecosystem.

### Components

<details>
    <summary>Markdown Documents</summary>

<br/>

A set of community maintained documents made up of guides and wiki-style documents helping to onboard new community members & developers.

<details>
  <summary>Documents Structure</summary>

```
|-- design
|   |-- attack-vectors.md
|   |-- basics.md
|   |-- challenges.md
|   |-- roadmap.md
|   `-- security.md
|-- getting-started-devs
|   |-- tutorials
|   |   `-- overview.md
|   |-- documentation.md
|   |-- getting-started.md
|   |-- integrations.md
|   |-- overview.md
|   `-- running-a-node.md
|-- getting-started-users
|   |-- storing
|   |   |-- basics.md
|   |   `-- setup.md
|   |-- acquiring.md
|   |-- basics.md
|   |-- best-practices.md
|   `-- using.md
|-- history
|   |-- community
|   |   `-- nano-trade.md
|   `-- overview.md
|-- introduction
|   |-- advantages.md
|   |-- basics.md
|   |-- how-it-works.md
|   |-- investment-thesis.md
|   |-- misconceptions.md
|   |-- nano-fixes-this.md
|   `-- why-it-matters.md
|-- community.md
|-- contributing.md
|-- faqs.md
|-- network.md
`-- support.md
```

</details>

</details>

<details>
    <summary>Content Aggregation & Categorization</summary>

<br/>

Automatic content aggregation, indexing, categorization and chronicling.

- Reddit Subreddit
- Reddit User
- Forum
- Discord
- Github

**Topics**

Content can be tagged to a topic to allow for members to easily explore past discussions around a certain topic. Each topic will have a neutral, concise, and high-level summary along with supporting & opposing arguments, and links to all past comments. Topics exist to easily point new members to past conversations as new members will naturally think of things already discussed by past members.

<details>
  <summary>Topics Structure</summary>

```
|-- spam
|   |-- ledger-spam.md
|   |   `-- minimum-account-balances.md
|   `-- congestion-spam.md
|-- tx-prioritization
|   |-- dpow.md
|   |-- fee.md
|   `-- taac-pos4qos.md
|-- attack-vectors.md
|-- consensus.md
|-- economics.md
|-- finality.md
|-- governance.md
|-- micropayments.md
|-- privacy.md
|-- scalability.md
|-- security.md
`-- wallets.md
```

</details>

</details>

<details>
    <summary>Nano Based Accounts & Voting</summary>

<br/>

Nano.Community accounts are a generated key-pair where the public key is signed by the private key pertaining to a nano account. This will allow associating a user's activity to an account on the nano network. The signing process will take place within a wallet (or on the commandline) and will not increase the risk/attack surface for a nano private key. This feature can be used to automate moderation of contributions as well as measuring support for or against certain proposals.

</details>

<details>
    <summary>Onboarding / Contribution Guides</summary>

<br/>

- Nano Documentation
- Nano Reference Implementation
- Nano.Community

</details>

<details>
    <summary>Community Conventions</summary>

<br/>

Community conventions will set forth best practices on how to format/structure posts across various platforms in the nano community.

- Reddit
- Forum
- Discord
- Github

</details>

<details>
    <summary>Nano Improvement Proposals (i.e. RFC)</summary>

<br/>

[needs more research]

See Zach's comments [here](https://www.reddit.com/r/nanocurrency/comments/m8l9j8/building_oss_infrastructure_to_help_improve/gru1unt)

</details>

## Start Contributing

Nano.Community aims to be a community run project and welcomes anyone to contribute. Start by reading the [contribution guidelines](https://github.com/mistakia/nano-community/blob/main/CONTRIBUTING.md).
