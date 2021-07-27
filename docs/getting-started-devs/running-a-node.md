---
title: Running a node
description: How to setup and run a nano node
tags: nano, node, setup, guide, wiki, run, how to
---

# Running a node

| Resources                                                                                                   | Description                                                             |
| ----------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| <a href="https://docs.nano.org/running-a-node/overview/" target="_blank">Overview</a>                       | Summary of node types, hardware & maintenance requirements              |
| <a href="https://docs.nano.org/integration-guides/build-options/" target="_blank">Build</a>                 | compiling & running from source                                         |
| <a href="https://docs.nano.org/running-a-node/node-setup/" target="_blank">Node Setup</a>                   | detailed instructions on how to setup a node using Docker               |
| <a href="https://docs.nano.org/running-a-node/voting-as-a-representative/" target="_blank">Voting Setup</a> | guide for setting up a representative (voting-node)                     |
| <a href="https://docs.nano.org/running-a-node/docker-management/" target="_blank">Docker</a>                | setting up a node using docker                                          |
| <a href="https://docs.nano.org/running-a-node/test-network/" target="_blank">Test Network</a>               | Test network exists primarily for general integration development       |
| <a href="https://docs.nano.org/running-a-node/beta-network/" target="_blank">Beta Network</a>               | Beta network is used for developing and testing changes to the protocol |
| <a href="https://docs.nano.org/releases/current-release-notes/" target="_blank">Release Notes</a>           | information about the latest version                                    |
| <a href="https://docs.nano.org/releases/node-releases/" target="_blank">Release History                     | Full release notes for previous versions                                |
| <a href="https://nanoo.tools/troubleshooting" target="_blank">Troubleshooting</a>                           | nanoo.tools troubleshooting guide                                       |

## Quickstart

If you are looking to integrate with the Nano network, the best way to test your integration is by using the test network.

Using docker is the easiest and fastest way to get up and running.

<details>
    <summary>Docker</summary>

#### Install Docker

```bash [g1:Mac OSX]
brew install --cask docker
open /Applications/Docker.app
```

#### Pull latest container

```bash
docker pull nanocurrency/nano-test:V22.1
```

#### Run

```bash
docker run --restart=unless-stopped -d \
  -p 17075:17075 \
  -p 17076:17076 \
  -p 17078:17078 \
  -v ~/Nano:/root \
  --name nano_node_test \
  nanocurrency/nano-test:V22.1
```

</details>

<details>
    <summary>Build</summary>

#### 1. Clone Repo

```
git clone --branch V22.1 --recursive https://github.com/nanocurrency/nano-node.git nano_build
cd nano_build
```

#### 2. Install Dependencies

```bash [g2:Mac OSX]
brew install git cmake gcc curl
```

```bash [g2:Ubuntu Debian]
apt-get update && apt-get upgrade
apt-get install git cmake g++ curl
```

#### 3. Install Boost

```bash
bash util/build_prep/bootstrap_boost.sh -m
```

#### 4. Compile

```bash [g3:Ubuntu Debian Mac OSX]
export BOOST_ROOT=`pwd`/../boost_build
cmake -DACTIVE_NETWORK=nano_test_network \
      -DBOOST_ROOT=/usr/local/boost/ \
      -G "Unix Makefiles" .
make nano_node
```

#### 5. Setup Config

##### config-node.toml

```toml
[node.websocket]

# WebSocket server bind address.
# type:string,ip
address = "::ffff:0.0.0.0"
# Enable or disable WebSocket server.
# type:bool
enable = true

[rpc]

# Enable or disable RPC.
# type:bool
enable = true
```

##### config-rpc.toml

```toml
# Bind address for the RPC server
# type:string,ip
address = "::ffff:0.0.0.0"

# Enable or disable control-level requests
# type:bool
enable_control = false
```

#### 6. Run

```bash
./nano_node --daemon --network test
```

</details>

<details>
    <summary>Check Status</summary>

Get the block and cemented count from your node and compare it to the network's average (via telemetry).

```bash
curl -d '{
  "action": "block_count"
}' http://127.0.0.1:17076
```

```bash
curl -d '{
  "action": "telemetry"
}' http://127.0.0.1:17076
```

</details>
