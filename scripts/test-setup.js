const hre = require("hardhat");
const ethers = hre.ethers;
const fs = require("fs");

const eTestLib = require("../test/lib/eTestLib");


async function main() {
    let networkName = process.env.NETWORK_NAME;
    
    const ctx = await eTestLib.deployGovernanceContracts(ethers.provider, await ethers.getSigners(), networkName);

    eTestLib.writeAddressManifestToFile(ctx, `./addresses/euler-addresses-${networkName}.json`);

}

// sample usage hardhat: NETWORK_NAME=hardhat npx hardhat run scripts/test-setup.js 
// sample usage rivet: NETWORK_NAME=rinkeby NODE_ENV=rivet npx hardhat run scripts/test-setup.js --network rinkeby

main();