// We require the Hardhat Runtime Environment explicitly here. This is optional 
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require("hardhat");
const { constants } = require('@openzeppelin/test-helpers');

async function main() {
    // Hardhat always runs the compile task when running scripts with its command
    // line interface.
    //
    // If this script is run directly using `node` you may want to call compile 
    // manually to make sure everything is compiled
    // await hre.run('compile');

    const name = 'Euler-Governor';

    const tokenName = 'Euler';
    const tokenSymbol = 'EUL';
    const totalSupply = '100000000000000000000';

    const minDelay = 3600;

    const votingDelay = 4; // blocks
    const votingPeriod = 16; // blocks
    const quorumNumerator = 4; // 4%, denominator = 100

    // getting accounts
    const [root, ...accounts] = await hre.ethers.getSigners();
    
    // Deploy Timelock contract
    const Timelock = await hre.ethers.getContractFactory("Timelock");
    const timelock = await Timelock.deploy(minDelay, [], []);
    await timelock.deployed();
    console.log("Timelock deployed to:", timelock.address);

    // Deploy Euler token contract
    const Euler = await hre.ethers.getContractFactory("EulerToken");
    const euler = await Euler.deploy(tokenName, tokenSymbol, totalSupply);
    await euler.deployed();
    console.log("Euler token deployed to:", euler.address);

    // Deploy Governance contract
    const Governance = await hre.ethers.getContractFactory("Governance");
    const governance = await Governance.deploy(
        name, euler.address, votingDelay, 
        votingPeriod, timelock.address, 
        quorumNumerator
    );
    await governance.deployed();
    console.log("Governance deployed to:", governance.address);

    // Proposer role - governor instance 
    await timelock.grantRole(await timelock.PROPOSER_ROLE(), governance.address);
    // Executor role - governor instance or zero address
    await timelock.grantRole(await timelock.EXECUTOR_ROLE(), constants.ZERO_ADDRESS);
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