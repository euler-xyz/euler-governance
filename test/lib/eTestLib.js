require("@nomiclabs/hardhat-waffle");

const { expect, assert, } = require("chai");
const { loadFixture, } = waffle;

const bn = require("bignumber.js");
const fs = require("fs");
const util = require("util");

const contractNames = [
    'Governance',
    'Timelock',
    'Euler',
    'TreasuryVester'
]

function writeAddressManifestToFile(ctx, filename) {
    let addressManifest = exportAddressManifest(ctx);
    let outputJson = JSON.stringify(addressManifest, ' ', 4);
    fs.writeFileSync(filename, outputJson + "\n");
}

async function deployGovernanceContracts(provider, wallets, tokenSetupName) {
    let ctx = await buildContext(provider, wallets, tokenSetupName);
    
    const name = "Euler Governor"

    const tokenName = 'Euler';
    const tokenSymbol = 'EUL';
    // const totalSupply = web3.utils.toWei('27182818.284590452353602874');
    const totalSupply = web3.utils.toWei('1000');

    const minDelay = 3600; // execution delay in seconds

    const votingDelay = 10; // blocks
    const votingPeriod = 6570; // blocks, 1 day assuming 13.14 seconds per block
    const quorumNumerator = 4; // 4% quorum, denominator = 100
    const proposalThreshold = web3.utils.toWei('100');

    ctx.contracts.timelock = await (await ctx.factories.Timelock.deploy(minDelay, [], [])).deployed();
    ctx.contracts.euler = await (await ctx.factories.Euler.deploy(tokenName, tokenSymbol, totalSupply, Date.now() + 1000)).deployed();
    ctx.contracts.governance = await (await ctx.factories.Governance.deploy(
        name, ctx.contracts.euler.address, votingDelay, 
        votingPeriod, ctx.contracts.timelock.address, 
        quorumNumerator, proposalThreshold
    )).deployed();

    // Proposer role - governor instance 
    const proposerRoleTx = await ctx.contracts.timelock.grantRole(await ctx.contracts.timelock.PROPOSER_ROLE(), ctx.contracts.governance.address);
    console.log(`Proposer Role Transaction: ${proposerRoleTx.hash}`);
    let result = await proposerRoleTx.wait();
    console.log(`Mined. Status: ${result.status}`);

    // Executor role - governor instance or zero address
    const executorRoleTx = await ctx.contracts.timelock.grantRole(await ctx.contracts.timelock.EXECUTOR_ROLE(), ctx.contracts.governance.address);
    console.log(`Executor Role Transaction: ${executorRoleTx.hash}`);
    result = await executorRoleTx.wait();
    console.log(`Mined. Status: ${result.status}`);
    // Admin role - deployer and timelock instance itself <address(this)> 
    // deployer can give up the role
    // await ctx.contracts.timelock.revokeRole(await ctx.contracts.timelock.TIMELOCK_ADMIN_ROLE(), root.address); 
    
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