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



# Commands (under construction)

Command parseBalanceMap

use this from merkle-distributor:
const { claims: innerClaims, merkleRoot, tokenTotal } = parseBalanceMap({
        [wallet0.address]: 200,
        [wallet1.address]: 300,
        [wallets[2].address]: 250,
      })


Comand pushToUpala
See API
retuns timestamp


Command pushToDB
Example message to DB:
{
groupID: "0x11111ed78501edb696adca9e41e78d8256b6"
merkleRoot: '0x11111ed78501edb696adca9e41e78d8256b61cfac45612fa0434d7cf87d92345',
tokenTotal: '0x02ee',
timestamp: '0xa35d',
claims: {
    [wallet0.address]: {
      index: 0,
      amount: '0xc8',
      proof: ['0x2a411ed78501edb696adca9e41e78d8256b61cfac45612fa0434d7cf87d916c6'],
    },
    [wallet1.address]: {
      index: 1,
      amount: '0x012c',
      proof: [
        '0xbfeb956a3b705056020a3b64c540bff700c0f6c96c55c0a5fcab57124cb36f7b',
        '0xd31de46890d4a77baeebddbd77bf73b5c626397b73ee8c69b51efe4c9a5a72fa',
      ],
    },
    [wallets[2].address]: {
      index: 2,
      amount: '0xfa',
      proof: [
        '0xceaacce7533111e902cc548e961d77b23a4d8cd073c6b68ccf55c62bd47fc36b',
        '0xd31de46890d4a77baeebddbd77bf73b5c626397b73ee8c69b51efe4c9a5a72fa',
      ],
    },
    })
