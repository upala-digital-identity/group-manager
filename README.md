# Group manager lib

The lib behind [group manager CLI](https://github.com/upala-digital-identity/group-manager-cli).

### Draft Developer notes

All individual scores are published to the [DB](https://github.com/upala-digital-identity/db) and can be accesses by DApps. DB will also have a web UX for group managers to view scores.
Base scores and score bundle hashes are stored on-chain.
The goal of this iteration is to let future managers to play around with the protocol and understand better their needs.

#### Interaction and references:

- Uses [deployments](https://github.com/upala-digital-identity/deployments) for contracts ABIs and addresses.
- Queries baseScore and bundleHash from [Upala subgraph](https://github.com/upala-digital-identity/subgraph-schema).
- Reads and writes individual scores to [DB](https://github.com/upala-digital-identity/db).
- Manages groups on-chain through [Upala groups](https://github.com/upala-digital-identity/upala/tree/master/contracts/pools).
- Uses metadata scheme from [Upala groups](https://github.com/upala-digital-identity/upala/tree/master/contracts/pools).

#### Merkle Tree Pool (future)

Merkle pool generates merkle tree from UpalaID-score pairs. The root of this three is then stored on-chain as score bundle hash. Users provide merkle proof to verify their scores. The procedure of updating the scores requires three steps.
**Merkle tree pool will be implemented after Signed Scores Pool. Can be skiped untill then.**


#### Announcements

Changes that require commit-reveal scheme. All commits are made through the same **commitHash(bytes32 hash)** function. The way hash is calculated is what differs for different changes.

todo
desribe attackWindow, executionWindow.

#### commitBaseScore(newScore, optional secret)

TBD

- **hash = keccak256(abi.encodePacked("setBaseScore", newScore, secret))** - calculate commitment hash
- call **commitHash(bytes32 hash)** function of the group contract
- save timestamp

#### set-base-score

Increasing base score doesn't require commit-reveal scheme and works for any pool-type. Group manager can increase **baseScore** at any time. Decreasing score requires a commit. The workflow for the command is as follows.

- querry graph node for the current **baseScore** (Graph "what is current base score for the group address?")
- question: "Your current base score is [%baseScore%] what is the new value?:"
- if new value is higher, call **increaseBaseScore(uint newBotReward)** function of the pool.
- if score is lower, **try to retrieve latest commit for setBaseScore from local storage (todo)**. if nothing found "Error: post a commit before decreasing the score"
- if there is a commit, call **setBaseScore(uint botReward, bytes32 secret)** function of the pool

#### commitRootDeletion()

TBD
**hash = keccak256(abi.encodePacked("deleteRoot", newRoot, secret))**
sends transaction: commitHash(bytes32 hash)

#### deleteRoot(bytes32 root, bytes32 secret)

TBD
send transaction: deleteRoot(bytes32 root, bytes32 secret)

#### commitWithdrawal(newScore, recipient, amount, optional secret)

TBD

- **hash = keccak256(abi.encodePacked("withdrawFromPool", recipient, amount, secret))**
- send transaction: commitHash(bytes32 hash)

#### withdrawFromPool(address recipient, uint amount, bytes32 secret)

TBD
send transaction: withdrawFromPool(address recipient, uint amount, bytes32 secret)


#### temp

Commits: firstArgument (commitType), timestamp, other arguments, secret
score bundle hashes (all published hashes)
for merkle - current unpublished tree and root

### Uniswap Merkle Distributor notes

The tools use Uniswap Merkle Distributor lib. This is their README.

