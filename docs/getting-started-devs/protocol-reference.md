# Protocol Reference

For a high-level overview of the protocol, review its [design](/design/basics). The details on this page are based on the <a href="https://github.com/nanocurrency/nano-node" target="_blank">reference implementation</a>.

- <a href="https://github.com/nanocurrency/protocol/tree/master/reference" target="_blank">Messaging Protocol Spec</a>
- <a href="https://github.com/nanocurrency/nanodb-specification" target="_blank">Database Format Spec</a>

<small>_Note: The reference implementation is under heavy development and rapidly changing. At times, this spec will be outdated and/or incomplete._</small>

#### Table of Contents

- [Election Scheduler](#election-scheduler)
- [Priority Queue / Tx Prioriziation](#priority-queue--tx-prioriziation)
- [Active elections](#active-elections)
- [Broadcasting a vote](#broadcasting-a-vote)
- [Processing incoming votes](#processing-incoming-votes)
- [Vote hinting](#vote-hinting)
- [Requesting votes](#requesting-votes)
- [Processing vote requests](#processing-vote-requests)
- [Final Votes](#final-votes)
- [Vote Spacing](#vote-spacing)
- [Processing a local block](#processing-a-local-block-via-rpc)
- [Processing a network block](#processing-a-network-block)
- [Confirmations](#confirmations)
- [Confirmation height processor](#confirmation-height-processor)
- [Pruning](#pruning)
- [Frontiers confirmation](#frontiers-confirmation)
- [Legacy bootstrapping](#legacy-bootstrapping)
- [Lazy bootstrapping](#lazy-bootstrapping)
- [Peering / rep crawler](#peering--rep-crawler)
- [Online reps](#online-reps)

## Election Scheduler

- has two queues:
  - **priority:** blocks from the network
  - **manual:** local confirmation requests (via rpc)
- handles adding a block to the priority queue
  - dependents must be confirmed
- when there is a vacancy in the active election container it will check both queues (manual & priority) and add the top block (will be changed in v22.1)
  - a block starts of with a passive election state, unless it is added from the priority queue and previously had an election
- upon starting an election, a node will generate & broadcast votes for that election (see [broadcasting a vote](#broadcasting-a-vote))

#### Notable Functions

- <a href="https://github.com/nanocurrency/nano-node/blob/33a974155ddf4b10fc3d2c72e4c20a8abe514aef/nano/node/election_scheduler.cpp#L90-L129" target="_blank">election_scheduler::run</a> — main loop waiting for vacancy
- <a href="https://github.com/nanocurrency/nano-node/blob/33a974155ddf4b10fc3d2c72e4c20a8abe514aef/nano/node/election_scheduler.cpp#L24-L46" target="_blank">election_scheduler::activate</a> — adding a block to the scheduler

## Priority Queue / Tx Prioriziation

- 128 buckets based on balance
  - based on bit in the balance field, determined by number of leading zeros
- bucket maximum size 250000
- bucket sorted by account last modified time (local time of last received block)
- when adding to a full bucket, the last block in the bucket is dropped
- when getting a block, the buckets are iterated one at a time and the first block in a bucket is selected.

#### Notable Functions

- <a href="https://github.com/nanocurrency/nano-node/blob/3135095da26738ba1a08cf2fdba02bdce3fe7abe/nano/node/prioritization.cpp#L43-L58" target="_blank">prioritization::prioritization</a> — bucket setup
- <a href="https://github.com/nanocurrency/nano-node/blob/3135095da26738ba1a08cf2fdba02bdce3fe7abe/nano/node/prioritization.cpp#L60-L77" target="_blank">prioritization::push</a> — adding a block
- <a href="https://github.com/nanocurrency/nano-node/blob/3135095da26738ba1a08cf2fdba02bdce3fe7abe/nano/node/prioritization.cpp#L87-L94" target="_blank">prioritization::pop</a> — getting a block

## Broadcasting a Vote

- only when an election is first started, can be by the election scheduler or by vote hinting

#### Notable Functions

- <a href="https://github.com/nanocurrency/nano-node/blob/aefa4d015284bab44c4f46e9504c40995b4c7fd8/nano/node/active_transactions.cpp#L790-L848" target="_blank">active_transactions::insert_impl</a> -> <a href="https://github.com/nanocurrency/nano-node/blob/aefa4d015284bab44c4f46e9504c40995b4c7fd8/nano/node/election.cpp#L509-L526" target="_blank">election::generate_votes</a> -> <a href="https://github.com/nanocurrency/nano-node/blob/aefa4d015284bab44c4f46e9504c40995b4c7fd8/nano/node/voting.cpp#L180-L217" target="_blank">vote_generator::add</a>

## Active Elections

- constainer size: 500 (soft limit)
  - can be exceeded by elections started by vote hinting
- every 500ms active elections are evaluated based on the order they were added
- any unconfirmed elections beyond the container size limit that are older than 2s are kicked out (this is an issue and will be modified in v22.1)
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

## Requesting Votes

- requests are made inside the active election request loop that runs every 500ms, evaluating the oldest election first
- vote requests are made if it has been either 10s (optimistic) or 5s (normal) since the last request
- starting with the highest weight reps, requests are made to a maximum of 50 reps per loop, with a maximum of 14 hashes per rep (split up into two requests of 7)

#### Notable Functions

- <a href="https://github.com/nanocurrency/nano-node/blob/98af16459a3cf6ac8a4e7523788eb70f5bdbf813/nano/node/election.cpp#L130-L141" target="_blank">election::send_confirm_req</a> -> <a href="https://github.com/nanocurrency/nano-node/blob/98af16459a3cf6ac8a4e7523788eb70f5bdbf813/nano/node/confirmation_solicitor.cpp#L55-L87" target="_blank">confirmation_solicitor::add</a>
- <a href="https://github.com/nanocurrency/nano-node/blob/98af16459a3cf6ac8a4e7523788eb70f5bdbf813/nano/node/confirmation_solicitor.cpp#L89-L113" target="_blank">nano::confirmation_solictor::flush</a>

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
- republish a newly seen vote if the node itself is not a rep with > 0.05% voting weight
  - fanout to random peers (0.5 \* sqrt(peers))
- votes for inactive elections are added to an inactive vote cache (see [vote hinting](#vote-hinting))

#### Notable Functions

- <a href="https://github.com/nanocurrency/nano-node/blob/f7f83e79cbf2f6edf30460fcd77a4283bffa2d5e/nano/node/vote_processor.cpp#L42-L92" target="_blank">process_loop</a> -> <a href="https://github.com/nanocurrency/nano-node/blob/f7f83e79cbf2f6edf30460fcd77a4283bffa2d5e/nano/node/vote_processor.cpp#L136-L169" target="_blank">verify_votes</a> -> <a href="https://github.com/nanocurrency/nano-node/blob/f7f83e79cbf2f6edf30460fcd77a4283bffa2d5e/nano/node/vote_processor.cpp#L171-L204" target="_blank">vote_blocking</a> -> <a href="https://github.com/nanocurrency/nano-node/blob/f7f83e79cbf2f6edf30460fcd77a4283bffa2d5e/nano/node/active_transactions.cpp#L877-L952" target="_blank">active_transactions::vote</a>
- <a href="https://github.com/nanocurrency/nano-node/blob/f7f83e79cbf2f6edf30460fcd77a4283bffa2d5e/nano/node/vote_processor.cpp#L94-L134" target="_blank">vote_processor::vote</a> — queue vote for processing
- <a href="https://github.com/nanocurrency/nano-node/blob/98af16459a3cf6ac8a4e7523788eb70f5bdbf813/nano/node/blockprocessor.cpp#L335-L358" target="_blank">block_processor::process_live</a> — process block from network

## Vote Hinting

## Processing Vote Requests

- received via <a href="https://github.com/nanocurrency/nano-node/blob/33a974155ddf4b10fc3d2c72e4c20a8abe514aef/nano/node/network.cpp#L418-L444" target="_blank">confirm_req</a> message
- reject requests if oldest request has taken longer than 600ms to process
- delay start of request procesing by 50ms with each new request (up to 300ms), allowing for vote requests to pool up to a max of 512 hashes
- loop through queued requests, processing the oldest request first once it has exceeded its delay
  - if the vote request is for a fork, send competing block to node
  - checks local vote cache for a vote before generating a new vote
    - remove any duplicates

#### Notable Functions

- <a href="https://github.com/nanocurrency/nano-node/blob/f7f83e79cbf2f6edf30460fcd77a4283bffa2d5e/nano/node/request_aggregator.cpp#L33-L67" target="_blank">request_aggregator::add</a> — process a new vote request
- <a href="https://github.com/nanocurrency/nano-node/blob/f7f83e79cbf2f6edf30460fcd77a4283bffa2d5e/nano/node/request_aggregator.cpp#L69-L115" target="_blank">request_aggregator::run</a> — request process loop
- <a href="https://github.com/nanocurrency/nano-node/blob/f7f83e79cbf2f6edf30460fcd77a4283bffa2d5e/nano/node/request_aggregator.cpp#L158-L247" target="_blank">request_aggregator::aggregate</a> — process request
- <a href="https://github.com/nanocurrency/nano-node/blob/f7f83e79cbf2f6edf30460fcd77a4283bffa2d5e/nano/node/voting.cpp#L208-L231" target="_blank">vote_generator::generate</a> — generate a new vote

## Final Votes

## Vote Spacing

## Processing A Local Block (via RPC)

- if dependents are confirmed it is added to the election scheduler.
- the block is broadcasted to the network
  - sent directly to all PRs
  - fanout to sqrt(non-PR peers)

#### Notable Functions

- <a href="https://github.com/nanocurrency/nano-node/blob/3135095da26738ba1a08cf2fdba02bdce3fe7abe/nano/node/node.cpp#L567-L579" target="_blank">node::process_local</a> -> <a href="https://github.com/nanocurrency/nano-node/blob/98af16459a3cf6ac8a4e7523788eb70f5bdbf813/nano/node/blockprocessor.cpp#L360-L535" target="_blank">block_processor::process_one</a> -> <a href="https://github.com/nanocurrency/nano-node/blob/98af16459a3cf6ac8a4e7523788eb70f5bdbf813/nano/node/blockprocessor.cpp#L335-L358" target="_blank">block_processor::process_live</a> -> <a href="https://github.com/nanocurrency/nano-node/blob/b43c218c4f824191e6062e2a3d10873428dbbc0c/nano/node/election_scheduler.cpp#L24-L46" target="_blank">election_scheduler::activate</a>

## Processing a Network Block

- recieved via a <a href="https://github.com/nanocurrency/nano-node/blob/33a974155ddf4b10fc3d2c72e4c20a8abe514aef/nano/node/network.cpp#L401-L417" target="_blank">publish</a> message
- once the block signature is validated, it is added to the block processing queue
- only 10 forks tracked (max_blocks) for a given election/root. On a new fork, the one with the lowest weight will be dropped

#### Notable Functions

- <a href="https://github.com/nanocurrency/nano-node/blob/33a974155ddf4b10fc3d2c72e4c20a8abe514aef/nano/node/node.cpp#L554-L558" target="_blank">process_active</a> -> <a href="https://github.com/nanocurrency/nano-node/blob/33a974155ddf4b10fc3d2c72e4c20a8abe514aef/nano/node/blockprocessor.cpp#L100-L122" target="_blank">block_processor::add</a>
- <a href="https://github.com/nanocurrency/nano-node/blob/33a974155ddf4b10fc3d2c72e4c20a8abe514aef/nano/node/blockprocessor.cpp#L155-L174" target="_blank">block_processor::process_blocks</a> -> <a href="https://github.com/nanocurrency/nano-node/blob/33a974155ddf4b10fc3d2c72e4c20a8abe514aef/nano/node/blockprocessor.cpp#L239-L333" target="_blank">block_processor::process_batch</a> -> <a href="https://github.com/nanocurrency/nano-node/blob/33a974155ddf4b10fc3d2c72e4c20a8abe514aef/nano/node/blockprocessor.cpp#L360" target="_blank">block_processor::process_one</a>

## Confirmations

- Upon confirmation if cemented bootstrap count has been reached, the block was confirmed via an election, and there are less than 500 active elections
  - add the next transaction to the election scheduler.
  - add the next transaction in the destination account to the election scheduler

## Confirmation Height Processor

## Pruning

## Frontiers Confirmation

## Legacy Bootstrapping

## Lazy Bootstrapping

## Peering / Rep Crawler

## Online Reps
