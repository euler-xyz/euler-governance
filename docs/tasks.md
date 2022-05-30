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


## Deploy governance and timelockController smart contracts 

The following parameters are required when deploying the governance and timelockController smart contracts:
* Eul token address
* Gnosis multisig address - to be assigned Proposal Canceller role in the timelock contract
* governorName - a string which is the name of the governance smart contract, e.g., Euler DAO v1.0
* minDelay - in seconds, the duration between queuing a successful proposal and the execution time / eta
* votingDelay - as number of blocks, between proposal creation and voting period starting
* votingPeriod - as number of blocks, for duration voting will go on for
* quorumNumerator - whole number, e.g., 4 which will be 4% quorum before a proposal can reach quorum. For, and abstain votes will be counted towards quorum. Once the voting period is over, if quorum was reached (enough voting power participated) and the majority voted in favor, the proposal is considered successful and can proceed to be executed.
* proposalThreshold - the amount of tokens required to create a proposal in human readable units, e.g., 5000. Will be converted to 1e18 precision.

Example command - `NODE_ENV=rivet npx hardhat --network rinkeby gov:deployGovernanceContracts 0x681E9cf95e26c6C2cEF09fdc476C7f8De6AFf2D5 0x13214Af5a958E47D0FA1366fC3D36dC3Fa46E80f "Euler Governor 1.0" 300 1 50 4 100`

After deployment, the contract addresses for governance and timelockController will be displayed on the console. 

Some Role checks are also performed after deployment and logged onto the console.

The contracts can then be verified as follows:
* Governance contract verification on rinkeby example (with proposal threshold in 1e18 precision) - `NODE_ENV=rivet npx hardhat verify --network rinkeby 0x681E9cf95e26c6C2cEF09fdc476C7f8De6AFf2D5 "Euler Governor v1.0" "0xe013C993A77Cdd1aC0d8c1B15a6eFf95EB36c8c6" "1" "50" "0x16fBC769237cE17830799e6faD9d53536c3B8389" "4" "100000000000000000000"`

* Timelockcontroller contract verification on rinkeby example using `arguments.js` script as the contract constructor takes in two arrays / tuples as constructor arguments - `NODE_ENV=rivet npx hardhat verify --network rinkeby --constructor-args arguments.js 0x16fBC769237cE17830799e6faD9d53536c3B8389`
