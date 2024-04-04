---
title: Protocol Reference
description: Nano protocol specification  based on the C++ reference implementation
tags: nano, docs, reference, specification, documentation, crypto, protocol, development
---

# Protocol Reference

For a high-level overview of the protocol, review its [design](/design/basics). The details on this page are based on the <a href="https://github.com/nanocurrency/nano-node" target="_blank">reference implementation</a>.

- <a href="https://github.com/nanocurrency/protocol/tree/master/reference" target="_blank">Messaging Protocol Specification</a>
- <a href="https://github.com/nanocurrency/nanodb-specification" target="_blank">Database Format Specification</a>

<small>_Note: The reference implementation is under heavy development and rapidly changing. At times, this spec will be outdated and/or incomplete._</small>

#### Table of Contents

- [Election Scheduler](#election-scheduler)
- [Priority Queue / Tx Prioritization](#priority-queue-tx-prioritization)
- [Active elections](#active-elections)
- [Broadcasting a vote](#broadcasting-a-vote)
- [Processing incoming votes](#processing-incoming-votes)
- [Vote hinting](#vote-hinting)
- [Requesting votes](#requesting-votes)
- [Processing vote requests](#processing-vote-requests)
- [Final Votes](#final-votes)
- [Vote Spacing](#vote-spacing)
- [Block Processor](#block-processor)
- [Processing a network block](#processing-a-network-block)
- [Confirmations](#confirmations)
- [Confirmation height processor](#confirmation-height-processor)
- [Pruning](#pruning)
- [Frontiers confirmation](#frontiers-confirmation)
- [Legacy bootstrapping](#legacy-bootstrapping)
- [Lazy bootstrapping](#lazy-bootstrapping)
- [Peering / rep crawler](#peering-rep-crawler)
- [Online reps](#online-reps)
- [Handshake](#handshake)
- [Telemetry](#telemetry)

## Election Scheduler

- manages two queues:
  - **priority:** main queue with all blocks
  - **manual:** local confirmation requests (via rpc)
- handles adding a block to the priority queue
  - dependents must be confirmed
- every 5m the scheduler is populated using the pool of unconfirmed blocks
- when there is a vacancy in the active election container it will check both queues (manual & priority) and add the top block (will be changed in v22.1)
  - a block starts of with a passive election state, unless it is added from the priority queue and previously had an election
- upon starting an election, a node will generate & broadcast votes for that election (see [broadcasting a vote](#broadcasting-a-vote))

#### Notable Functions

- <a href="https://github.com/nanocurrency/nano-node/blob/33a974155ddf4b10fc3d2c72e4c20a8abe514aef/nano/node/election_scheduler.cpp#L90-L129" target="_blank">election_scheduler::run</a> — main loop waiting for vacancy
- <a href="https://github.com/nanocurrency/nano-node/blob/33a974155ddf4b10fc3d2c72e4c20a8abe514aef/nano/node/election_scheduler.cpp#L24-L46" target="_blank">election_scheduler::activate</a> — adding a block to the scheduler
- <a href="https://github.com/nanocurrency/nano-node/blob/3135095da26738ba1a08cf2fdba02bdce3fe7abe/nano/node/node.cpp#L1738-L1756" target="_blank">node::populate_backlog</a> — populates scheduler from pool of unconfirmed blocks

---

## Priority Queue / Tx Prioritization

- 62 buckets based on balance (there were 129 balance buckets <a href="https://github.com/nanocurrency/nano-node/pull/3980" target="_blank">before V24</a> )
- the `max (balance, previous_balance)` is used (only the current balance was used <a href="https://github.com/nanocurrency/nano-node/pull/4022" target="_blank">before V24</a>)
  - based on bit, determined by number of leading zeros
  - done <a href="https://nano.org/en/blog/v24-siglos-development-update-final-phase-of-testing--eb7075e2" target="_blank">to address</a> sending the full balance putting the transaction in the lowest priority tier
- maximum of 4,032 (`250,000 / 62`) blocks per bucket (formerly 1,937)
- bucket sorted by account last modified time (local time of last received block)
- when adding to a full bucket, the last block (newest account modified timestamp) in the bucket is dropped
- when getting a block, the buckets are iterated one at a time and the first block in a bucket is selected.

#### Notable Functions

- <a href="https://github.com/nanocurrency/nano-node/blob/V24.0RC2/nano/node/election_scheduler.cpp#L43" target="_blank">election_scheduler::activate</a> — adding a block with its priority to the scheduler
- <a href="https://github.com/nanocurrency/nano-node/blob/3135095da26738ba1a08cf2fdba02bdce3fe7abe/nano/node/prioritization.cpp#L43-L58" target="_blank">prioritization::prioritization</a> — bucket setup
- <a href="https://github.com/nanocurrency/nano-node/blob/3135095da26738ba1a08cf2fdba02bdce3fe7abe/nano/node/prioritization.cpp#L60-L77" target="_blank">prioritization::push</a> — adding a block
- <a href="https://github.com/nanocurrency/nano-node/blob/3135095da26738ba1a08cf2fdba02bdce3fe7abe/nano/node/prioritization.cpp#L87-L94" target="_blank">prioritization::pop</a> — getting a block

---

## Broadcasting a Vote

- when an election is first started, which can be by the election scheduler or via [vote hinting](#vote-hinting)

#### Notable Functions

- <a href="https://github.com/nanocurrency/nano-node/blob/aefa4d015284bab44c4f46e9504c40995b4c7fd8/nano/node/active_transactions.cpp#L790-L848" target="_blank">active_transactions::insert_impl</a> -> <a href="https://github.com/nanocurrency/nano-node/blob/aefa4d015284bab44c4f46e9504c40995b4c7fd8/nano/node/election.cpp#L509-L526" target="_blank">election::generate_votes</a> -> <a href="https://github.com/nanocurrency/nano-node/blob/aefa4d015284bab44c4f46e9504c40995b4c7fd8/nano/node/voting.cpp#L180-L217" target="_blank">vote_generator::add</a>

---

## Active Elections

- container size: 5000
- elections are activated through the [election scheduler](#election-scheduler) and [vote hinting](#vote-hinting)
- only 10 forks are tracked. On a new fork, the one with the lowest weight will be dropped
- every 500ms active elections are evaluated based on the order they were added
- election states are transitioned as follows
  - passing -> active after 5 seconds
  - confirmed -> expired confirmed after 5 seconds
  - active -> expired unconfirmed after 1m (optimistic) or 5m (normal)
- expired elections are removed
- for any elections in the active state
  - the block is broadcasted if it has been more than 15s since the last broadcast (up to a maximum of 30 times)
    - sent directly to all PRs who have not yet voted or voted for a different fork
    - fanout to random peers (0.5 \* sqrt(peers))
  - vote requests are sent if it has been either 10s (optimistic) or 5s (normal) since last request (see [requesting votes](#requesting-votes))

#### Election States

- Passive
- Active
- Broadcasting
- Expired Confirmed
- Expired Unconfirmed

#### Notable Functions

- <a href="https://github.com/nanocurrency/nano-node/blob/3135095da26738ba1a08cf2fdba02bdce3fe7abe/nano/node/active_transactions.cpp#L556-L590" target="_blank">active_transactions::request_loop</a> -> <a href="https://github.com/nanocurrency/nano-node/blob/3135095da26738ba1a08cf2fdba02bdce3fe7abe/nano/node/active_transactions.cpp#L291-L348" target="_blank">active_transactions::request_confirm</a>
- <a href="https://github.com/nanocurrency/nano-node/blob/3135095da26738ba1a08cf2fdba02bdce3fe7abe/nano/node/confirmation_solicitor.cpp#L27-L53" target="_blank">confirmation_solicitor::broadcast</a> — block broadcasting
- <a href="https://github.com/nanocurrency/nano-node/blob/33a974155ddf4b10fc3d2c72e4c20a8abe514aef/nano/node/election.cpp#L169-L214" target="_blank">election::transition_time</a> — election state transitioning

---

## Requesting Votes

- requests are made inside the active election request loop that runs every 500ms, evaluating the oldest election first
- vote requests are made if it has been either 10s (optimistic) or 5s (normal) since the last request
- starting with the highest weight reps, requests are made to a maximum of 50 reps per loop, with a maximum of 14 hashes per rep
  - each `confirm_req` contains a maximum of 7 hashes

#### Notable Functions

- <a href="https://github.com/nanocurrency/nano-node/blob/98af16459a3cf6ac8a4e7523788eb70f5bdbf813/nano/node/election.cpp#L130-L141" target="_blank">election::send_confirm_req</a> -> <a href="https://github.com/nanocurrency/nano-node/blob/98af16459a3cf6ac8a4e7523788eb70f5bdbf813/nano/node/confirmation_solicitor.cpp#L55-L87" target="_blank">confirmation_solicitor::add</a>
- <a href="https://github.com/nanocurrency/nano-node/blob/98af16459a3cf6ac8a4e7523788eb70f5bdbf813/nano/node/confirmation_solicitor.cpp#L89-L113" target="_blank">nano::confirmation_solictor::flush</a>

---

## Processing Incoming Votes

- received via <a href="https://github.com/nanocurrency/nano-node/blob/33a974155ddf4b10fc3d2c72e4c20a8abe514aef/nano/node/network.cpp#L445-L474" target="_blank">confirm_ack</a> message
- exclude vote confirmations for blocks belonging to the burn address
- process block if message includes block & block processor is not full
- vote processing queue limit: 147,456
- votes are accepted based on capacity using a weighted approach
  - below 67%, all votes are accepted
  - between 67% and 77%, only PRs
  - between 77% and 88%, PRs above 1% weight
  - above 88%, PRs above 5% weight
- vote signature is verified
- broadcast a newly seen vote if the node itself is not a rep with > 0.05% voting weight
  - fanout to random peers (0.5 \* sqrt(peers))
- votes for inactive elections are added to an inactive vote cache (see [vote hinting](#vote-hinting))

#### Notable Functions

- <a href="https://github.com/nanocurrency/nano-node/blob/f7f83e79cbf2f6edf30460fcd77a4283bffa2d5e/nano/node/vote_processor.cpp#L42-L92" target="_blank">process_loop</a> -> <a href="https://github.com/nanocurrency/nano-node/blob/f7f83e79cbf2f6edf30460fcd77a4283bffa2d5e/nano/node/vote_processor.cpp#L136-L169" target="_blank">verify_votes</a> -> <a href="https://github.com/nanocurrency/nano-node/blob/f7f83e79cbf2f6edf30460fcd77a4283bffa2d5e/nano/node/vote_processor.cpp#L171-L204" target="_blank">vote_blocking</a> -> <a href="https://github.com/nanocurrency/nano-node/blob/f7f83e79cbf2f6edf30460fcd77a4283bffa2d5e/nano/node/active_transactions.cpp#L877-L952" target="_blank">active_transactions::vote</a>
- <a href="https://github.com/nanocurrency/nano-node/blob/f7f83e79cbf2f6edf30460fcd77a4283bffa2d5e/nano/node/vote_processor.cpp#L94-L134" target="_blank">vote_processor::vote</a> — queue vote for processing
- <a href="https://github.com/nanocurrency/nano-node/blob/98af16459a3cf6ac8a4e7523788eb70f5bdbf813/nano/node/blockprocessor.cpp#L335-L358" target="_blank">block_processor::process_live</a> — process block from network

#### Broadcast incoming vote pathway

- <a href="https://github.com/nanocurrency/nano-node/blob/1885e9cb0ebc308db936d9f90a8432b3a3bf384d/nano/node/network.cpp#L478-L489" target="_blank">message_visitor.confirm_ack()</a> -> <a href="https://github.com/nanocurrency/nano-node/blob/1885e9cb0ebc308db936d9f90a8432b3a3bf384d/nano/node/vote_processor.cpp#L94-L134" target="_blank">vote_processor.vote()</a> -> <a href="https://github.com/nanocurrency/nano-node/blob/1885e9cb0ebc308db936d9f90a8432b3a3bf384d/nano/node/vote_processor.cpp#L42-L92" target="_blank">vote_processor.process_loop</a> -> <a href="https://github.com/nanocurrency/nano-node/blob/1885e9cb0ebc308db936d9f90a8432b3a3bf384d/nano/node/vote_processor.cpp#L136-L169" target="_blank">vote_processor.verify_votes()</a> -> <a href="https://github.com/nanocurrency/nano-node/blob/1885e9cb0ebc308db936d9f90a8432b3a3bf384d/nano/node/vote_processor.cpp#L171-L204" target="_blank">vote_processor.vote_blocking()</a> -> <a href="https://github.com/nanocurrency/nano-node/blob/1885e9cb0ebc308db936d9f90a8432b3a3bf384d/nano/node/active_transactions.cpp#L858-L912" target="_blank">active_transactions.vote()</a> -> <a href="https://github.com/nanocurrency/nano-node/blob/1885e9cb0ebc308db936d9f90a8432b3a3bf384d/nano/node/network.cpp#L229-L236" target="_blank">network.flood_vote()</a>
  - Relevant Func: <a href="https://github.com/nanocurrency/nano-node/blob/1885e9cb0ebc308db936d9f90a8432b3a3bf384d/nano/node/election.cpp#L341-L396" target="_blank">election.vote()</a>

---

## Vote Hinting

- votes for inactive elections are stored in a cache
- only votes from PRs are stored
- votes for a maximum of 16,384 hashes are stored
  - configurable via `inactive_votes_cache_size`
- when the cache is full the oldest hash is evicted
- on a new vote, the tally is evaluated
  - it is confirmed if the tally exceeds the quorum delta
  - if the block is missing, a lazy bootstrap process is started to get the block when the tally is more than ~0.4% of the trended weight
  - an election is started if it has received 15 or more votes (from PRs) and 10% or more of the online trended weight
    - weight threshold configurable via `election_hint_weight_percent`

#### Notable Functions

- <a href="https://github.com/nanocurrency/nano-node/blob/aefa4d015284bab44c4f46e9504c40995b4c7fd8/nano/node/active_transactions.cpp#L1154-L1220" target="_blank">active_transactions::add_inactive_votes_cache</a> — adds vote
- <a href="https://github.com/nanocurrency/nano-node/blob/aefa4d015284bab44c4f46e9504c40995b4c7fd8/nano/node/active_transactions.cpp#L1282-L1323" target="_blank">active_transactions::inactive_votes_bootstrap_check_impl</a> — checks tally

---

## Processing Vote Requests

- received via <a href="https://github.com/nanocurrency/nano-node/blob/33a974155ddf4b10fc3d2c72e4c20a8abe514aef/nano/node/network.cpp#L418-L444" target="_blank">confirm_req</a> message
- reject new requests if oldest request has taken longer than 600ms to process
- delay start of request processing by 50ms with each new request (up to 300ms), allowing for vote requests to pool up to a max of 512 hashes
- loop through queued requests, processing the oldest request first once it has exceeded its delay
  - if the vote request is for a fork, send competing block to node
  - checks local vote cache for a vote before generating a new vote
    - remove any duplicates

#### Notable Functions

- <a href="https://github.com/nanocurrency/nano-node/blob/f7f83e79cbf2f6edf30460fcd77a4283bffa2d5e/nano/node/request_aggregator.cpp#L33-L67" target="_blank">request_aggregator::add</a> — process a new vote request
- <a href="https://github.com/nanocurrency/nano-node/blob/f7f83e79cbf2f6edf30460fcd77a4283bffa2d5e/nano/node/request_aggregator.cpp#L69-L115" target="_blank">request_aggregator::run</a> — request process loop
- <a href="https://github.com/nanocurrency/nano-node/blob/f7f83e79cbf2f6edf30460fcd77a4283bffa2d5e/nano/node/request_aggregator.cpp#L158-L247" target="_blank">request_aggregator::aggregate</a> — process request
- <a href="https://github.com/nanocurrency/nano-node/blob/f7f83e79cbf2f6edf30460fcd77a4283bffa2d5e/nano/node/voting.cpp#L208-L231" target="_blank">vote_generator::generate</a> — generate a new vote

---

## Final Votes

- For unconfirmed blocks, regular voting quorum is checked and a final vote is generated in three instances:
  - on a new vote for an active election
  - on election activation
  - on receiving a new live fork

#### Notable Pathways

- <a href="https://github.com/nanocurrency/nano-node/blob/aefa4d015284bab44c4f46e9504c40995b4c7fd8/nano/node/active_transactions.cpp#L851-L926" target="_blank">active_transactions::vote()</a> -> <a href="https://github.com/nanocurrency/nano-node/blob/aefa4d015284bab44c4f46e9504c40995b4c7fd8/nano/node/election.cpp#L342-L397" target="_blank">election::vote()</a> -> <a href="https://github.com/nanocurrency/nano-node/blob/aefa4d015284bab44c4f46e9504c40995b4c7fd8/nano/node/election.cpp#L270-L310" target="_blank">election::confirm_if_quorum</a> -> <a href="https://github.com/nanocurrency/nano-node/blob/aefa4d015284bab44c4f46e9504c40995b4c7fd8/nano/node/voting.cpp#L180-L217" target="_blank">vote_generator::add()</a>
- <a href="https://github.com/nanocurrency/nano-node/blob/aefa4d015284bab44c4f46e9504c40995b4c7fd8/nano/node/active_transactions.cpp#L790-L848" target="_blank">active_transactions::insert_impl()</a> -> <a href="https://github.com/nanocurrency/nano-node/blob/aefa4d015284bab44c4f46e9504c40995b4c7fd8/nano/node/election.cpp#L457-L486" target="_blank">election::insert_inactive_votes_cache()</a> -> <a href="https://github.com/nanocurrency/nano-node/blob/aefa4d015284bab44c4f46e9504c40995b4c7fd8/nano/node/election.cpp#L270-L310" target="_blank">election::confirm_if_quorum</a> -> <a href="https://github.com/nanocurrency/nano-node/blob/aefa4d015284bab44c4f46e9504c40995b4c7fd8/nano/node/voting.cpp#L180-L217" target="_blank">vote_generator::add()</a>
- <a href="https://github.com/nanocurrency/nano-node/blob/aefa4d015284bab44c4f46e9504c40995b4c7fd8/nano/node/blockprocessor.cpp#L489" target="_blank">block_processor::process_one()</a> -> <a href="https://github.com/nanocurrency/nano-node/blob/aefa4d015284bab44c4f46e9504c40995b4c7fd8/nano/node/active_transactions.cpp#L1073-L1094" target="_blank">active_transactions::publish()</a> -> <a href="https://github.com/nanocurrency/nano-node/blob/aefa4d015284bab44c4f46e9504c40995b4c7fd8/nano/node/election.cpp#L457-L486" target="_blank">election::insert_inactive_votes_cache()</a> -> <a href="https://github.com/nanocurrency/nano-node/blob/aefa4d015284bab44c4f46e9504c40995b4c7fd8/nano/node/election.cpp#L270-L310" target="_blank">election::confirm_if_quorum</a> -> <a href="https://github.com/nanocurrency/nano-node/blob/aefa4d015284bab44c4f46e9504c40995b4c7fd8/nano/node/voting.cpp#L180-L217" target="_blank">vote_generator::add()</a>

---

## Vote Spacing

## Block Processor

- validates the block signature, height, representative, balance, and work field
- excludes burn account blocks
- if the previous block or source block is missing, it is added to unchecked
- new checked blocks added locally (via RPC) are broadcasted to the network
  - sent directly to all PRs
  - fanout to sqrt(non-PR peers)
- new checked blocks from the network are rebroadcasted
  - fanout to sqrt(all peers)
- the block is added to the election scheduler if the dependents are confirmed and it is a new block

#### Notable Functions

- <a href="https://github.com/nanocurrency/nano-node/blob/1885e9cb0ebc308db936d9f90a8432b3a3bf384d/nano/node/blockprocessor.cpp#L344-L498" target="_blank">block_processor::process_one</a> -> <a href="https://github.com/nanocurrency/nano-node/blob/1885e9cb0ebc308db936d9f90a8432b3a3bf384d/nano/node/blockprocessor.cpp#L315-L342" target="_blank">block_processor::process_live</a> -> <a href="https://github.com/nanocurrency/nano-node/blob/1885e9cb0ebc308db936d9f90a8432b3a3bf384d/nano/node/election_scheduler.cpp#L24-L46" target="_blank">election_scheduler::activate</a>

---

## Processing a Network Block

- received via a <a href="https://github.com/nanocurrency/nano-node/blob/33a974155ddf4b10fc3d2c72e4c20a8abe514aef/nano/node/network.cpp#L401-L417" target="_blank">publish</a> message
- once the block signature is validated, it is added to the block processing queue

#### Notable Functions

- <a href="https://github.com/nanocurrency/nano-node/blob/33a974155ddf4b10fc3d2c72e4c20a8abe514aef/nano/node/node.cpp#L554-L558" target="_blank">process_active</a> -> <a href="https://github.com/nanocurrency/nano-node/blob/33a974155ddf4b10fc3d2c72e4c20a8abe514aef/nano/node/blockprocessor.cpp#L100-L122" target="_blank">block_processor::add</a>
- <a href="https://github.com/nanocurrency/nano-node/blob/33a974155ddf4b10fc3d2c72e4c20a8abe514aef/nano/node/blockprocessor.cpp#L155-L174" target="_blank">block_processor::process_blocks</a> -> <a href="https://github.com/nanocurrency/nano-node/blob/33a974155ddf4b10fc3d2c72e4c20a8abe514aef/nano/node/blockprocessor.cpp#L239-L333" target="_blank">block_processor::process_batch</a> -> <a href="https://github.com/nanocurrency/nano-node/blob/33a974155ddf4b10fc3d2c72e4c20a8abe514aef/nano/node/blockprocessor.cpp#L360" target="_blank">block_processor::process_one</a>

---

## Confirmations

- Upon block confirmation, an election for the successor block and destination account block are started if the following conditions are met:
  - cemented bootstrap count has been reached
  - the block had a previous election
  - there are less than 500 active elections
- added to the confirmation height processor queue

#### Notable Functions

- <a href="https://github.com/nanocurrency/nano-node/blob/3135095da26738ba1a08cf2fdba02bdce3fe7abe/nano/node/election.cpp#L269-L309" target="_blank">election::confirm_if_quorum</a> -> <a href="https://github.com/nanocurrency/nano-node/blob/3135095da26738ba1a08cf2fdba02bdce3fe7abe/nano/node/election.cpp#L39-L68" target="_blank">election::confirm_once</a> -> <a href="https://github.com/nanocurrency/nano-node/blob/3135095da26738ba1a08cf2fdba02bdce3fe7abe/nano/node/node.cpp#L1350-L1375" target="_blank">node::process_confirmed</a> -> <a href="https://github.com/nanocurrency/nano-node/blob/98af16459a3cf6ac8a4e7523788eb70f5bdbf813/nano/node/confirmation_height_processor.cpp#L155-L162" target="_blank">confirmation_height_processor::add</a>

---

## Confirmation Height Processor

- After confirmation, the Nano node cements transactions as final and irreversible. The confirmation_height_processor is responsible for this process.
- There is (as of V24) a bounded & unbounded implementation of the cementing algorithm. See: `unbounded_processor` & `bounded_processor`.
- `Confirmation height` is a number that represents the most recently confirmed block in an account chain. For example, if there are 15 transactions in an account, and 14 of them are confirmed, the confirmation height would be 14, while the block height would be 15.

#### Notable Functions

- <a href="https://github.com/nanocurrency/nano-node/blob/releases/v24/nano/node/confirmation_height_processor.cpp#L14-L34" target="_blank">nano::confirmation_height_processor::confirmation_height_processor</a>
- <a href="https://github.com/nanocurrency/nano-node/blob/releases/v24/nano/node/confirmation_height_processor.cpp#L54-L142" target="_blank">nano::confirmation_height_processor::run</a>

## Pruning

## Frontiers Confirmation

## Legacy Bootstrapping

## Lazy Bootstrapping

## Peering / Rep Crawler

- connect to previously connected peers stored in the database
  - establish a tcp connection
  - send a keepalive message
  - check to see if peer is a representative
- keepalive messages propagate a list of 8 random peers
- when online weight is below minimum, send keepalive to preconfigured peers
  - default host: `peering.nano.org`
  - default port: `7075`
- search peers for reps every 3s when below minimum online weight, otherwise every 7s
- to check if a peer is a representative, a vote is requested on a random block, the peer has 5s to respond

#### Notable Functions

- <a href="https://github.com/nanocurrency/nano-node/blob/33a974155ddf4b10fc3d2c72e4c20a8abe514aef/nano/node/repcrawler.cpp#L79-L102" target="_blank">rep_crawler::ongoing_crawl</a>
- <a href="https://github.com/nanocurrency/nano-node/blob/33a974155ddf4b10fc3d2c72e4c20a8abe514aef/nano/node/node.cpp#L35-L66" target="_blank">node::keepalive</a>
- <a href="https://github.com/nanocurrency/nano-node/blob/33a974155ddf4b10fc3d2c72e4c20a8abe514aef/nano/node/network.cpp#L139-L144" target="_blank">network::send_keepalive</a>

---

## Online Reps

- online weight is based on:
  - votes from a rep on an active election
  - vote responses to rep crawler requests
  - reps are removed 5m after their last observed vote (`weight_period`)
- online weight is calculated on every new rep or if it has been 5m
- the online weight is saved every 5m
- the trending weight is calculated every 5m by selecting the median weight over the last `4032` periods (i.e. 14 days)
- the delta weight is the highest weight among trending, online, or minimum multiplied by `0.67`

### Notable Functions

- <a href="https://github.com/nanocurrency/nano-node/blob/f7f83e79cbf2f6edf30460fcd77a4283bffa2d5e/nano/node/online_reps.cpp#L17-L33" target="_blank">online_reps::observe</a> — add rep to online weight
- <a href="https://github.com/nanocurrency/nano-node/blob/f7f83e79cbf2f6edf30460fcd77a4283bffa2d5e/nano/node/online_reps.cpp#L35-L55" target="_blank">online_reps::sample</a> — save online weight
- <a href="https://github.com/nanocurrency/nano-node/blob/f7f83e79cbf2f6edf30460fcd77a4283bffa2d5e/nano/node/online_reps.cpp#L67-L82" target="_blank">online_reps::calculate_trend</a> — calculate trending

---

## Handshake

## Telemetry
