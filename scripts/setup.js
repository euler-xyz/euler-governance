const hre = require("hardhat");
const ethers = hre.ethers;
const fs = require("fs");

const eTestLib = require("../test/lib/eTestLib");


async function main() {
    let networkName = process.env.NETWORK_NAME;
    
    const ctx = await eTestLib.deployGovernanceContracts(ethers.provider, await ethers.getSigners(), networkName);

    eTestLib.writeAddressManifestToFile(ctx, `./addresses/euler-addresses-${networkName}.json`);

}

// sample usage: NETWORK_NAME=hardhat npx hardhat run scripts/setup.js 

main();