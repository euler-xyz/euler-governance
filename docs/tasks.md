# Tasks guide


## Get latest block number

`NODE_ENV=rivet npx hardhat --network ropsten vesting:latestBlock`


## Deploy vesting factory contract

The following parameters are required: EUL token address followed by treasury address.

`NODE_ENV=rivet npx hardhat --network ropsten vesting:deployFactory 0x2FEe9F774f8d963bF253D41111d03ae990B0834D 0x13214af5a958e47d0fa1366fc3d36dc3fa46e80f`
 -> add address to README file


## Create new vesting schedule / deploy new vesting contract for a recipient 

Only current vesting factory admin can use this task.

The following parameters are required: vestingFactory address, recipient address, vestingAmount, vestingBegin timestamp, vestingCliff timestamp, and vestingEnd timestamp.

Vesting amount will be converted to 18 decimals within the hardhat task.

Vesting begin must be equal to or greater than 1st of January, 2022. ie., 1640995200 in unix timestamp 

Vesting cliff must be >= Vesting Begin.

Vesting end must be >= Vesting cliff.

`NODE_ENV=rivet npx hardhat --network ropsten vesting:createVesting 0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9 0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266 10 16378424780 16378424880 16378424980` 

This will log the following (sample) data upon deployment:
Vesting Contract Address: 0xE451980132E65465d0a498c53f0b5227326Dd73F
Vesting Contract Index: 1 
Vesting Contract Recipient: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266

Note: Vesting Contract Index is > 0 if more than one vesting contract/schedule is created for the same recipient.


## Withdraw excess EUL tokens from vesting factory contract

Only current vesting factory admin can use this task.

Specified amount will be converted to 18 decimals within the hardhat task.

`NODE_ENV=rivet npx hardhat --network ropsten vesting:withdraw 0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9 50`


## Update the treasury address (recipient of withdrawn excess EUL tokens)

Only current vesting factory admin can use this task.

The following parameters are required: vestingFactory address, and treasury address.

`NODE_ENV=rivet npx hardhat --network ropsten vesting:withdraw 0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9 0x612fB03ffE34e5217ac7524204e45F6211C08360`


## Get an array of the vesting contracts created for a recipient

Requires the address of the vesting factory contract and recipient address

`NODE_ENV=rivet npx hardhat --network ropsten vesting:getVestingContracts vestingFactory recipient`


## Create vesting contracts from csv file. 

The csv file should have the following headings: 
`recipientAddress,vestingAmount,vestingCliff,vestingEnd`

and sample data:

`0x5a45ede034c66766ACb2590F96C5bC6D1D922520,200,1643673600,1767225600`