// We require the Hardhat Runtime Environment explicitly here. This is optional 
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require("hardhat");
const ethers = hre.ethers;
const fs = require("fs");


async function main() {
    // Hardhat always runs the compile task when running scripts with its command
    // line interface.
    //
    // If this script is run directly using `node` you may want to call compile 
    // manually to make sure everything is compiled
    // await hre.run('compile');

    // getting accounts

    // Note: replace mutisig with mainnet multisig address    
    const [root, multiSig] = await hre.ethers.getSigners();

    const tokenName = 'Euler';
    const tokenSymbol = 'EUL';
    const totalSupply = web3.utils.toWei('27182818.284590452353602874');
    const mintingRestrictedBefore = '1767225600'; // 1st January 2026, 12am
    const treasury = multiSig.address;
    
    // Deploy Euler token contract
    const Euler = await hre.ethers.getContractFactory("Eul");
    const euler = await Euler.deploy(
        tokenName, 
        tokenSymbol, 
        totalSupply,
        mintingRestrictedBefore,
        treasury
    );
    console.log(`Euler Deployment Transaction: ${euler.deployTransaction.hash}`);

    await euler.deployed();
    console.log("Euler token deployed to:", euler.address);
    console.log("Deployer Euler token balance after deployment:", ethers.utils.formatEther(await euler.balanceOf(root.address)));
    console.log("Treasury/Multisig Euler token balance after deployment:", ethers.utils.formatEther(await euler.balanceOf(multiSig.address)));

    // Note: only default/god-like admin can grant and revoke roles.
    // other roles, e.g., admins cannot transfer but renounce role.
    const defaultAdminRole = await euler.DEFAULT_ADMIN_ROLE(); 
    const adminRole = await euler.ADMIN_ROLE();
    console.log("Multisig is default admin: ", await euler.hasRole(defaultAdminRole, treasury));
    console.log("Multisig is admin: ", await euler.hasRole(adminRole, treasury));
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });