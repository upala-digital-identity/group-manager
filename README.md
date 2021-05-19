# @uniswap/merkle-distributor

[![Tests](https://github.com/Uniswap/merkle-distributor/workflows/Tests/badge.svg)](https://github.com/Uniswap/merkle-distributor/actions?query=workflow%3ATests)
[![Lint](https://github.com/Uniswap/merkle-distributor/workflows/Lint/badge.svg)](https://github.com/Uniswap/merkle-distributor/actions?query=workflow%3ALint)

# Local Development

The following assumes the use of `node@>=10`.

## Install Dependencies

`yarn`

## Compile Contracts

`yarn compile`

## Run Tests

`yarn test`



# Commands

## createGroup
input: manager address
returns: groupID

## getPoolAddress 
input: groupID
returns group's pool address 

## generateTree
input:
csv file: [upalaId, score]

use this from merkle-distributor:

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

## increaseBaseScore(uint newBotReward) 

## pushRootToUpala
input generateTree's output
sends transaction to Upala (see API) 
retuns timestamp

## pushToDB
Input: generateTree's output, timestamp, groupID
sends data to DB (see Upala's infrastructure)
Example message to DB:

  {
      groupID: "0x11111ed78501edb696adca9e41e78d8256b6",
      merkleRoot: '0x11111e501...fa0434d7cf87d92345',
      tokenTotal: '0x02ee',
      timestamp: '0xa35d',
      claims: {
          [wallet0.address]: {
            index: 0,
            score: '0xc8',
            proof: ['0x2a411ed78501edb....fa0434d7cf87d916c6'],
          },
          [wallet1.address]: {
            index: 1,
            score: '0x012c',
            proof: [
              '0xbfeb956a3b70505...55c0a5fcab57124cb36f7b',
              '0xd31de46890d4a77...73ec69b51efe4c9a5a72fa',
            ],
          },
      },
  }


## commitRootDeletion()
hash = keccak256(abi.encodePacked("deleteRoot", newRoot, secret));
sends transaction: commitHash(bytes32 hash)

## commitBaseScore(newScore, optional secret)
hash = keccak256(abi.encodePacked("setBaseScore", newScore, secret));
sends transaction: commitHash(bytes32 hash)

## commitWithdrawal(newScore, recipient,  amount, optional secret)
hash = keccak256(abi.encodePacked("withdrawFromPool", recipient,  amount, secret));
sends transaction: commitHash(bytes32 hash)

## deleteRoot(bytes32 root, bytes32 secret)
sends transaction: deleteRoot(bytes32 root, bytes32 secret)

## setBaseScore(uint botReward, bytes32 secret)
sends transaction: setBaseScore(uint botReward, bytes32 secret)

## withdrawFromPool(address recipient, uint amount, bytes32 secret) 
sends transaction: withdrawFromPool(address recipient, uint amount, bytes32 secret)