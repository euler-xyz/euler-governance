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

  // getting accounts
  const [root, ...accounts] = await hre.ethers.getSigners();

  // Deploy Timelock contract
  const Timelock = await hre.ethers.getContractFactory("Timelock");
  // deploying timelock with delay of 2 days in seconds, i.e., 86400 seconds per day
  const timelock = await Timelock.deploy(root.address, 86400 * 2);
  await timelock.deployed();
  console.log("Timelock deployed to:", timelock.address);

  // Deploy Euler governance token contract
  const Eul = await hre.ethers.getContractFactory("Eul");
  const eul = await Eul.deploy(root.address);
  await eul.deployed();
  console.log("Euler governance token deployed to:", eul.address);

  // Deploy Governance contract
  const Gov = await hre.ethers.getContractFactory("Governance");
  const gov = await Gov.deploy(timelock.address, eul.address, root.address);
  await gov.deployed();
  console.log("Governance deployed to:", gov.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
