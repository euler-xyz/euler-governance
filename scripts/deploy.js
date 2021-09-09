// We require the Hardhat Runtime Environment explicitly here. This is optional 
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require("hardhat");
const { constants } = require('@openzeppelin/test-helpers');
const { web3 } = require("@openzeppelin/test-helpers/src/setup");
const fs = require("fs");


async function main() {
    // Hardhat always runs the compile task when running scripts with its command
    // line interface.
    //
    // If this script is run directly using `node` you may want to call compile 
    // manually to make sure everything is compiled
    // await hre.run('compile');

    const name = 'Test-Euler-Governor';

    const tokenName = 'Euler';
    const tokenSymbol = 'EUL';
    // const totalSupply = web3.utils.toWei('27182818.284590452353602874');
    const totalSupply = web3.utils.toWei('1000');

    const minDelay = 3600; // execution delay in seconds

    const votingDelay = 10; // blocks
    const votingPeriod = 6570; // blocks, 1 day assuming 13.14 seconds per block
    const quorumNumerator = 4; // 4% quorum, denominator = 100
    const proposalThreshold = web3.utils.toWei('100');

    // getting accounts
    const [root, ...accounts] = await hre.ethers.getSigners();
    
    // Deploy Timelock contract
    const Timelock = await hre.ethers.getContractFactory("Timelock");
    const timelock = await Timelock.deploy(minDelay, [], []);
    console.log(`Timelock Deployment Transaction: ${timelock.deployTransaction.hash}`);

    await timelock.deployed();
    console.log("Timelock deployed to:", timelock.address);

    // Deploy Euler token contract
    const Euler = await hre.ethers.getContractFactory("Euler");
    const euler = await Euler.deploy(tokenName, tokenSymbol, totalSupply);
    console.log(`Euler Deployment Transaction: ${euler.deployTransaction.hash}`);

    await euler.deployed();
    console.log("Euler token deployed to:", euler.address);
    console.log("Deployer Euler token balance:", web3.utils.fromWei((await euler.balanceOf(root.address)).toString()));

    // Deploy Governance contract
    const Governance = await hre.ethers.getContractFactory("Governance");
    const governance = await Governance.deploy(
        name, euler.address, votingDelay, 
        votingPeriod, timelock.address, 
        quorumNumerator, proposalThreshold
    );
    console.log(`Governance Deployment Transaction: ${governance.deployTransaction.hash}`);
    await governance.deployed();
    console.log("Governance deployed to:", governance.address);

    // Proposer role - governor instance 
    const proposerRoleTx = await timelock.grantRole(await timelock.PROPOSER_ROLE(), governance.address);
    console.log(`Proposer Role Transaction: ${proposerRoleTx.hash}`);
    let result = await proposerRoleTx.wait();
    console.log(`Mined. Status: ${result.status}`);

    // Executor role - governor instance or zero address
    const executorRoleTx = await timelock.grantRole(await timelock.EXECUTOR_ROLE(), governance.address);
    console.log(`Executor Role Transaction: ${executorRoleTx.hash}`);
    result = await executorRoleTx.wait();
    console.log(`Mined. Status: ${result.status}`);
    // Admin role - deployer and timelock instance itself <address(this)> 
    // deployer can give up the role
    // await timelock.revokeRole(await timelock.TIMELOCK_ADMIN_ROLE(), root.address); 
    
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });