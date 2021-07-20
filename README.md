# Upala group manager

Tools to create and manage Upala groups. The goal of this iteration is to let future managers to play around with the protocol and understand better their needs. 
All scores are published to the DB. It has an interface to view scores (??todo). 

## Initialization

#### init
Skip the config steps below for now. Auto-select Rinkeby network and generate menmonic by default. Write into config file (see below). 

Connecting to Upala 
- question: "select network:" (default: rinkeby)
- write network to config

Chosing or generating new seed phrase
- question: "generate new seed phrase?" (default: yes)
- generate the seed 
- save to **secrets.js**

Connecting to a pool
- question: "Connect to an existing Upala group" (default: no)
- if connecting to existing group, write group address to config
- if "no" is selected nothing happens.

## Group creation
There are two types of pools: MerkleTreePool and SignedScoresPool. SignedScoresPool will be implemented first. It is the default pool type.

#### create-group [--manger address --poolFactory address]
- question: "Select group manager address:" (default: wallet[0] derived from the seed).
- write group manager to config. 
- question: "Select pool factory" ({options: {MerkleTreePool, SignedScoresPool}, default: SignedScoresPool})
- retrieve pool factory address and abi by name from ./contracts/src (see example data structure [here](https://github.com/upala-digital-identity/upala-front/tree/master/packages/contracts/src) - will be in a separate module soon. todo)
- write **poolType** to confing.
- call **createPool()** function of the selected poolFactory.
- write the response address to **groupAddress** in config.


## Scores mangement
Different pool types have different workflows of score management. Two pools are described in this doc: **Signed Scores Pool** and **Merkle Tree Pool**. There are also changes that use commit-reveal scheme in order to prevent group managers front-running exploding bots. 

### Signed Scores Pool
This pool stores score bundle hash on chain (which is a random number generated by the pool contract). Group manager signes scores for each user along with the score bundle hash. The signature is then user by user to confirm their score on-chain.

#### publish-score-bundle
- call **publishScoreBundle()** function of the pool. It will return **scoreBundleHash**.
- store hash in **local storage** (todo)

#### update-scores
- question: "select csv file". csv file fromat: [upalaId: address, score: uint256]
- check csv file. Need valid pair address-uint256. If not valid: "Error: provided csv file is not valid"
- question: "select score Bundle Hash"
- check if bundleHash is active on-chain (Graph "is this bundleHash deleted"). "Error: Provided score bundle hash is deleted or doesn't exist". 
- sign each score. keccack(upalaId, uint256, bundleHash) todo
- sign the whole message with managers private key
- send POST message to DB (see example message in [DB repo](https://github.com/upala-digital-identity/db)). Show db module error if there's one.

### Merkle Tree Pool (future)
Merkle pool generates merkle tree from UpalaID-score pairs. The root of this three is then stored on-chain as score bundle hash. Users provide merkle proof to verify their scores. The procedure of updating the scores requires three steps. 
**Merkle tree pool will be implemented after Signed Scores Pool. Can be skiped untill then.** 

#### create-score-bundle
- question: "select csv file". csv file fromat: [upalaId: address, score: uint256]
- check csv file. Need valid pair address-uint256. If not valid: "Error: provided csv file is not valid"
- generate merkle tree 

see this from uniswap merkle-distributor:

    const { claims: innerClaims, merkleRoot, tokenTotal } = parseBalanceMap({
      [wallet0.address]: 200,
      [wallet1.address]: 300,
      [wallets[2].address]: 250,
    })

returns what parseBalanceMap returns

    {
      merkleRoot,
      tokenTotal,
      claims,
    }

- store parsed merkle tree and root in **local storage** todo

#### publish-score-bundle
- publish merkle root through **publishScoreBundle(bytes32 newRoot)** function of the pool. Returns timestamp.

#### update-scores
- send POST request to DB (see example message in [DB repo](https://github.com/upala-digital-identity/db)). Show db module error if there's one.

## Announcements
Changes that require commit-reveal scheme

#### commitBaseScore(newScore, optional secret)
TBD
hash = keccak256(abi.encodePacked("setBaseScore", newScore, secret));
sends transaction: commitHash(bytes32 hash)

#### set-base-score
Increasing base score doesn't require commit-reveal scheme and works for any pool-type. Group manager can increase **baseScore** at any time. Decreasing score requires a commit. The workflow for the command is as follows. 
- querry graph node for the current **baseScore** (Graph "what is current base score for the group address?")
- question: "Your current base score is [%baseScore%] what is the new value?:"
- if new value is higher, call **increaseBaseScore(uint newBotReward)** function of the pool. 
- if score is lower, **try to retrieve latest commit for setBaseScore from local storage (todo)**. if nothing found "Error: post a commit before decreasing the score"
- if there is a commit, call **setBaseScore(uint botReward, bytes32 secret)** function of the pool

#### commitRootDeletion()
TBD
hash = keccak256(abi.encodePacked("deleteRoot", newRoot, secret));
sends transaction: commitHash(bytes32 hash)

#### deleteRoot(bytes32 root, bytes32 secret)
TBD
sends transaction: deleteRoot(bytes32 root, bytes32 secret)

#### commitWithdrawal(newScore, recipient,  amount, optional secret)
TBD
hash = keccak256(abi.encodePacked("withdrawFromPool", recipient,  amount, secret));
sends transaction: commitHash(bytes32 hash)

#### withdrawFromPool(address recipient, uint amount, bytes32 secret)
TBD
sends transaction: withdrawFromPool(address recipient, uint amount, bytes32 secret)



## Local storage

#### pool-manager.config.js

    module.exports = {
      network: "rinkeby",
      groupManager: "0x35ab...2232",
      poolAddress: "0x35ab...2277",
      poolType: "",
      secretsPath: "./path/to/secrets.js"
    }

#### secrets.js
Stores access credentials. 

    module.exports = { 
        mnemonic: "test test test ... junk"
    };

#### temp
latest commit for setBaseScore (+secret)
score bundle hashes (all published hashes)
for merkle - current unpublished tree and root

### Uniswap Merkle Distributor notes

The tools use Uniswap Merkle Distributor lib. This is their README.

[![Tests](https://github.com/Uniswap/merkle-distributor/workflows/Tests/badge.svg)](https://github.com/Uniswap/merkle-distributor/actions?query=workflow%3ATests)
[![Lint](https://github.com/Uniswap/merkle-distributor/workflows/Lint/badge.svg)](https://github.com/Uniswap/merkle-distributor/actions?query=workflow%3ALint)

#### Local Development

The following assumes the use of `node@>=10`.

**Install Dependencies** `yarn`

**Compile Contracts** `yarn compile`

**Run Tests** `yarn test`
