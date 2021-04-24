Nano.Community aims to be a community run project and is grateful to all that step up to contribute. You don't need permission to work on anything, but it's always best to let others know what you're planning to do. You can do this by:

- Commenting on an [issue or PR in GitHub](https://github.com/mistakia/nano-community/issues)
- Messaging on the [Nano Discord server](https://chat.nano.org/)

Before contributing, make sure you're familiar with the [vision](https://github.com/mistakia/nano-community#nanocommunity) of Nano.Community

### Contributing content

- [Write simply](http://www.paulgraham.com/simply.html)
- Keep content for users concise
- Direct users to existing content on the [official Nano documentation](https://docs.nano.org/)
- Use an impartial tone and neutral point of view. Content should be as objective as possible.
- Pull requests are preferred to issues, especially for small changes such as typos. Issues should be used for generic or broad-based changes or missing content.
- Smaller pull requests are preffered over a single large one.

### Contributing code

JavaScript & markdown are used to make the project as accessible as possible.

<details>
  <summary>Directory Structure</summary>

```
|-- api         node.js api server for posts, network stats
|-- db          schema for mysql
|-- docs        wiki & knowledge hub
|-- src         single page react app (deployed to IPFS)
`-- topics      docs for each topic
```

</details>

#### Set up your local environment

1. Install [Node.js](https://nodejs.org/) and [Yarn](https://yarnpkg.com/)

2. Clone your fork

```
$ git clone git@github.com:[your_github_handle]/nano-community.git && cd nano-community
```

3. Add upstream remote

```
$ git remote add upstream https://github.com/mistakia/nano-community.git
```

To sync your fork with the latest changes

```
$ git checkout main
$ git fetch upstream
$ git merge upstream/main
```

4. Install dependencies

```
yarn install
```

#### Start contributing

1. Create a new branch for your changes

```
git checkout -b new_feature_name
```

2. Start developing

```
yarn dev
```

3. Before commiting your changes, make sure to run prettier, lint, and build.

```
yarn prettier
yarn lint
yarn build
```

## Developer's Certificate of Origin 1.1

By making a contribution to this project, I certify that:

(a) The contribution was created in whole or in part by me and I
have the right to submit it under the open source license
indicated in the file; or

(b) The contribution is based upon previous work that, to the best
of my knowledge, is covered under an appropriate open source
license and I have the right under that license to submit that
work with modifications, whether created in whole or in part
by me, under the same open source license (unless I am
permitted to submit under a different license), as indicated
in the file; or

(c) The contribution was provided directly to me by some other
person who certified (a), (b) or (c) and I have not modified
it.

(d) I understand and agree that this project and the contribution
are public and that a record of the contribution (including all
personal information I submit with it, including my sign-off) is
maintained indefinitely and may be redistributed consistent with
this project or the open source license(s) involved.
