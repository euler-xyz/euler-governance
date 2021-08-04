// We require the Hardhat Runtime Environment explicitly here. This is optional 
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require("hardhat");
const {toBN} = web3.utils;

async function main() {
  // Hardhat always runs the compile task when running scripts with its command
  // line interface.
  //
  // If this script is run directly using `node` you may want to call compile 
  // manually to make sure everything is compiled
  // await hre.run('compile');

  // getting accounts
  const [root, ...accounts] = await hre.ethers.getSigners();

  // Deploy Timelock contract
  const Timelock = await hre.ethers.getContractFactory("Timelock");
  // deploying timelock with delay of 2 days in seconds, i.e., 86400 seconds per day
  const timelock = await Timelock.deploy(root.address, 86400 * 2);
  await timelock.deployed();
  console.log("Timelock deployed to:", timelock.address);

  // Deploy Euler governance token contract
  const Eul = await hre.ethers.getContractFactory("EulerToken");
  const eul = await Eul.deploy(root.address);
  await eul.deployed();
  console.log("Euler governance token deployed to:", eul.address);

  // Deploy Governanor Bravo Delegate contract
  const GovDelegate = await hre.ethers.getContractFactory("GovernorBravoDelegate");
  const govDelegate = await GovDelegate.deploy();
  await govDelegate.deployed();
  console.log("Governanor Bravo Delegate deployed to:", govDelegate.address);

  // Deploy Governanor Bravo Delegator contract
  const GovDelegator = await hre.ethers.getContractFactory("GovernorBravoDelegator");
  const govDelegator = await GovDelegator.deploy(
    timelock.address, // address timelock_
    eul.address, // address comp_
    root.address, // address admin_
    govDelegate.address, // address implementation_
    80640, // uint votingPeriod_
    40320, // uint votingDelay_
    '100000000000000000000000', // uint proposalThreshold_
  );
  await govDelegator.deployed();
  console.log("Governanor Bravo Delegator deployed to:", govDelegator.address);

  
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
