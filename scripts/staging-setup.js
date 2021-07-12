const hre = require("hardhat");
const ethers = hre.ethers;
const fs = require("fs");

const eTestLib = require("../test/lib/eTestLib");


async function main() {
    const ctx = await eTestLib.deployGovernanceContracts(ethers.provider, await ethers.getSigners(), 'staging');

    eTestLib.writeAddressManifestToFile(ctx, "./euler-addresses.json");

}

main();