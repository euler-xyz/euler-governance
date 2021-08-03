require("@nomiclabs/hardhat-waffle");

const { expect, assert, } = require("chai");
const { loadFixture, } = waffle;

const bn = require("bignumber.js");
const fs = require("fs");
const util = require("util");

const contractNames = [
    'Governance',
    'Timelock',
    'EulerToken',
]

function writeAddressManifestToFile(ctx, filename) {
    let addressManifest = exportAddressManifest(ctx);
    let outputJson = JSON.stringify(addressManifest, ' ', 4);
    fs.writeFileSync(filename, outputJson + "\n");
}

async function deployGovernanceContracts(provider, wallets, tokenSetupName) {
    let ctx = await buildContext(provider, wallets, tokenSetupName);
    ctx.contracts.timelock = await (await ctx.factories.Timelock.deploy(wallets[0].address, 86400 * 2)).deployed();
    ctx.contracts.eulerToken = await (await ctx.factories.EulerToken.deploy(wallets[0].address)).deployed();
    ctx.contracts.governance = await (await ctx.factories.Governance.deploy(ctx.contracts.timelock.address, ctx.contracts.eulerToken.address, wallets[0].address)).deployed();
    
    return ctx;
} 

async function buildContext(provider, wallets, tokenSetupName) {
    let ctx = {
        provider,
        wallet: wallets[0],
        wallet2: wallets[1],
        wallet3: wallets[2],
        wallet4: wallets[3],

        contracts: {
            
        },

    }

    // Contract factories

    ctx.factories = {};

    for (let c of contractNames) {
        ctx.factories[c] = await ethers.getContractFactory(c);
    }

    // Time routines

    ctx.startTime = (await provider.getBlock()).timestamp;
    ctx._lastJumpTime = ctx.startTime;

    ctx.checkpointTime = async () => {
        ctx._lastJumpTime = (await provider.getBlock()).timestamp;
    };

    ctx.jumpTime = async (offset) => {
        // Only works on hardhat EVM
        ctx._lastJumpTime += offset;
        await provider.send("evm_setNextBlockTimestamp", [ctx._lastJumpTime]);
    };

    ctx.mineEmptyBlock = async () => {
        await provider.send("evm_mine");
    };

    ctx.increaseTime = async (offset) => {
        await provider.send("evm_increaseTime", [offset]);
    };

    return ctx;

}

function exportAddressManifest(ctx) {
    let output = {};

    for (let name of Object.keys(ctx.contracts)) {
        if (ctx.contracts[name].address) output[name] = ctx.contracts[name].address;
    }

    return output;
}

module.exports = {
    // default fixtures
    deployGovernanceContracts,
    writeAddressManifestToFile,

    // re-exports for convenience
    loadFixture,
    expect,
    assert,
    ethers,

    // utils
    MaxUint256: ethers.constants.MaxUint256,
    AddressZero: ethers.constants.AddressZero,
    BN: ethers.BigNumber.from,
    eth: (v) => ethers.utils.parseEther('' + v),
    units: (v, decimals) => ethers.utils.parseUnits('' + v, decimals),
    c1e18: ethers.BigNumber.from(10).pow(18),
    c1e27: ethers.BigNumber.from(10).pow(27),

};
