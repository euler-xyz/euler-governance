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
    const totalSupply = web3.utils.toWei('27182818.28');

    const minDelay = 3600; // execution delay in seconds

    const votingDelay = 4; // blocks - voting delay
    const votingPeriod = 16; // blocks
    const quorumNumerator = 5; // 5% quorum, denominator = 100
    const proposalThreshold = web3.utils.toWei('10');

    // getting accounts
    const [root, ...accounts] = await hre.ethers.getSigners();
    
    // Deploy Timelock contract
    /* const Timelock = await hre.ethers.getContractFactory("Timelock");
    const timelock = await Timelock.deploy(minDelay, [], []);
    await timelock.deployed();
    console.log("Timelock deployed to:", timelock.address); */

    // Deploy Euler token contract
    const Euler = await hre.ethers.getContractFactory("Euler");
    const euler = await Euler.deploy(tokenName, tokenSymbol, totalSupply);
    await euler.deployed();
    console.log("Euler token deployed to:", euler.address);
    console.log("Deployer Euler token balance:", web3.utils.fromWei((await euler.balanceOf(root.address)).toString()));

    // Deploy Governance contract
    /* const Governance = await hre.ethers.getContractFactory("Governance");
    const governance = await Governance.deploy(
        name, euler.address, votingDelay, 
        votingPeriod, timelock.address, 
        quorumNumerator, proposalThreshold
    );
    await governance.deployed();
    console.log("Governance deployed to:", governance.address);

    // Proposer role - governor instance 
    await timelock.grantRole(await timelock.PROPOSER_ROLE(), governance.address);
    // Executor role - governor instance or zero address
    await timelock.grantRole(await timelock.EXECUTOR_ROLE(), governance.address);
    // Admin role - deployer and timelock instance itself <address(this)> 
    // deployer can give up the role
    // await timelock.revokeRole(await timelock.TIMELOCK_ADMIN_ROLE(), root.address); */
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });