require("@nomiclabs/hardhat-waffle");

const { expect, assert, } = require("chai");
const { loadFixture, } = waffle;

const bn = require("bignumber.js");
const fs = require("fs");
const util = require("util");

const contractNames = [
    'Governance',
    'TimelockController',
    'Eul',
    'TreasuryVester'
]

function writeAddressManifestToFile(ctx, filename) {
    let addressManifest = exportAddressManifest(ctx);
    let outputJson = JSON.stringify(addressManifest, ' ', 4);
    fs.writeFileSync(filename, outputJson + "\n");
}

async function deployGovernanceContracts(provider, wallets, tokenSetupName) {
    let ctx = await buildContext(provider, wallets, tokenSetupName);
    
    const root = wallets[0];

    console.log("Deployer", root.address);

    const name = "Euler Governor"

    const tokenName = 'Eul';
    const tokenSymbol = 'EUL';
    const totalSupply = web3.utils.toWei('27182818.284590452353602874');

    const minDelay = 300; // 3600; // execution delay in seconds

    const votingDelay = 1; // 10; // blocks
    // voting period 10 blocks on ropsten and 50 on rinkeby
    const votingPeriod = 50; // 6570; // blocks, 1 day assuming 13.14 seconds per block
    const quorumNumerator = 4; // 4% quorum, denominator = 100
    const proposalThreshold = web3.utils.toWei('100');

    ctx.contracts.timelock = await (
        await ctx.factories.TimelockController.deploy(minDelay, [], [])
    ).deployed();
        
    let eul_token_address = '0x0';
    if (tokenSetupName == 'rinkeby') {
        eul_token_address = '0xe013C993A77Cdd1aC0d8c1B15a6eFf95EB36c8c6';
    } else {
        ctx.contracts.eul = await (await ctx.factories.Eul.deploy(
            tokenName, tokenSymbol, 
            totalSupply, Date.now() + 1000,
            wallets[0].address
        )).deployed();

        eul_token_address = ctx.contracts.eul.address;
    }

    ctx.contracts.eul = await ctx.factories.Eul.attach(eul_token_address);
    
    ctx.contracts.governance = await (await ctx.factories.Governance.deploy(
        name, 
        eul_token_address, 
        votingDelay, // blocks
        votingPeriod, // blocks
        ctx.contracts.timelock.address, 
        quorumNumerator, 
        proposalThreshold // token amount, i.e., the number of votes required in order for a voter to become a proposer
    )).deployed();

    console.log(
        `Timelock contract: ${ctx.contracts.timelock.address}`
    );

    console.log(
        `Eul token contract: ${eul_token_address}`
    );

    console.log(
        `Governance contract: ${ctx.contracts.governance.address}`
    );

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
    // deployer can give up the timelock admin role
    // await ctx.contracts.timelock.revokeRole(await ctx.contracts.timelock.TIMELOCK_ADMIN_ROLE(), root.address); 
        
    // Canceller role - admin user
    const cancellerRoleTx = await ctx.contracts.timelock.grantRole(await ctx.contracts.timelock.CANCELLER_ROLE(), root.address);
    console.log(`Canceller Role Transaction: ${cancellerRoleTx.hash}`);
    result = await cancellerRoleTx.wait();
    console.log(`Mined. Status: ${result.status}`);

    // on mainnet, only admin / multisig can cancel proposals
    /* const cancellerRoleGovTx = await ctx.contracts.timelock.grantRole(await ctx.contracts.timelock.CANCELLER_ROLE(), ctx.contracts.governance.address);
    console.log(`Canceller Role Transaction: ${cancellerRoleGovTx.hash}`);
    result = await cancellerRoleGovTx.wait();
    console.log(`Mined. Status: ${result.status}`); */

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
        if (c === 'TimelockController') {
            ctx.factories[c] = await ethers.getContractFactory('contracts/governance/TimelockController.sol:TimelockController');
        } else {
            ctx.factories[c] = await ethers.getContractFactory(c);
        }
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