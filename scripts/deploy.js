// We require the Hardhat Runtime Environment explicitly here. This is optional 
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require("hardhat");

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

    const minDelay = 3600;

    const votingDelay = 4; // blocks
    const votingPeriod = 16; // blocks
    const quorumNumerator = 4; // 4%, denominator = 100

    // getting accounts
    const [root, ...accounts] = await hre.ethers.getSigners();
    
    // Deploy Timelock contract
    const Timelock = await hre.ethers.getContractFactory("TimelockController");
    const timelock = await Timelock.deploy(minDelay, [], []);
    await timelock.deployed();
    console.log("Timelock deployed to:", timelock.address);

    // Deploy Euler token contract
    const Euler = await hre.ethers.getContractFactory("ERC20VotesMock");
    const euler = await Euler.deploy(tokenName, tokenSymbol);
    await euler.deployed();
    console.log("Euler token deployed to:", euler.address);
    // todo - setup total supply and allocate to msgSender

    // Deploy Governance contract
    const Governance = await hre.ethers.getContractFactory("GovernorTimelockControlMock");
    const governance = await Governance.deploy(
        name, euler.address, votingDelay, 
        votingPeriod, timelock.address, 
        quorumNumerator
    );
    await governance.deployed();
    console.log("Governance deployed to:", governance.address);
    // todo - setup roles in timelock contract
    // Proposer role - governor instance 
    // Executor role - governor instance
    // Admin role - deployer and timelock instance <address(this)>

}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });