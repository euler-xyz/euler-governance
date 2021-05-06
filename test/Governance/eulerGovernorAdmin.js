const { expect } = require('chai');
const { ZERO_ADDRESS, getActorsAsync } = require('../../helpers/address');
const { 
    duration, 
    increaseTo, 
    latest, 
    shouldFailWithMessage, 
    toBN 
} = require('../../helpers/utils');
const { expectBignumberEqual } = require('../../helpers/index');
const { parseEther } = require('@ethersproject/units');
const {PROPOSAL_STATES} = require('../../helpers/constants');
const {
  etherUnsigned,
  mineBlock,
  freezeTime,
  increaseTime,
  mineBlockNumber
} = require('../helpers/Ethereum');

const EulerToken = artifacts.require('EulerToken');
const Governance = artifacts.require('Governance');
const TimeLock = artifacts.require('Timelock');
const TimeLockHarness = artifacts.require('TimelockHarness');
const Markets = artifacts.require('Markets');
const EulerGovernance = artifacts.require('EulerGovernance');

const fs = require("fs");
const util = require("util");


function parseFactor(v) {
    let n = parseFloat(v);
    if (isNaN(n) || n < 0 || n > 1) throw(`unexpected factor value: ${v}`);
    return Math.floor(n * 4e9);
}

function parseTwap(v) {
    let n = parseInt(v);
    if (isNaN(n) || n <= 0) throw(`unexpected twap value: ${v}`);
    return n;
}

describe('Governance (Timelock contract) and Euler Governor Admin', () => {
    let accounts;
    let wallet;
    let wallet1;
    let owner;
    let govInstance;
    let timelockInstance;
    let eulerTokenInstance;

    const governanceAddresses = JSON.parse(fs.readFileSync(`./euler-addresses.json`));
    const eulerAddresses = JSON.parse(fs.readFileSync(`./euler-contracts/euler-addresses.json`));

    async function enfranchise(actor, amount) {
        await eulerTokenInstance.transfer(actor, amount);
        await eulerTokenInstance.delegate(actor, {from: actor});
    }

    before(async () => {
        [owner, wallet, wallet1, ...accounts] = await web3.eth.getAccounts();
        govInstance = await Governance.at(governanceAddresses.governance);
        timelockInstance = await TimeLock.at(governanceAddresses.timelock);
        eulerTokenInstance = await EulerToken.at(governanceAddresses.eulerToken);

        // transfer tokens to meet proposition threshold of 4% of total Eul tokens
        await enfranchise(wallet, parseEther('400001'));
        await enfranchise(wallet1, parseEther('400001'));

        await eulerTokenInstance.delegate(owner);
    });


    it('should set governance as admin in timelock', async () => {
        expect(await timelockInstance.admin()).to.be.equal(owner); 

        const now = await latest();
        const delay = await timelockInstance.delay();
        const executionTimeStamp = now.add(delay).add(duration.minutes(20));
        
        const setAdmin = govInstance.address;
        const targets = timelockInstance.address;
        const values = '0';
        const signatures = 'setPendingAdmin(address)';
        const callDatas = ethers.utils.defaultAbiCoder.encode(['address'], [setAdmin]);
        
        // queue setPendingAdmin() on Timelock
        await timelockInstance.queueTransaction(targets, values, signatures, callDatas, executionTimeStamp, {from: owner});

        // execute setPendingAdmin() - After the ETA is reached, call executeTransaction() on the Timelock contract using the owner wallet to execute setPendingAdmin() using the arguments
        await increaseTo(executionTimeStamp);

        await timelockInstance.executeTransaction(targets, values, signatures, callDatas, executionTimeStamp, {from: owner});
        
        expect(await timelockInstance.pendingAdmin()).to.be.equal(govInstance.address);
        
        await govInstance.__acceptAdmin({from: owner});

        expect(await timelockInstance.pendingAdmin()).to.be.equal(ZERO_ADDRESS);
        expect(await timelockInstance.admin()).to.be.equal(govInstance.address);
    })


    it('should update interest model/IRM of an asset by targeting Euler Governance contract via proposal', async () => {
        expect(await timelockInstance.admin()).to.be.equal(govInstance.address);
        expect(await govInstance.guardian()).to.be.equal(owner); 

        const eulerGovernanceInstance =  await EulerGovernance.at(eulerAddresses.governance);
        // check euler governance governorAdmin is timelock contract
        // requires governorAdmin in Storage,sol to be public
        // expect(await eulerGovernanceInstance.governorAdmin()).to.be.equal(timelockInstance.address);
        
        const irm_params = {
            IRM_ZERO: 2000000,
            IRM_FIXED: 2000001,
            DAI: eulerAddresses.tokens.DAI
        };

        // create proposal data
        const targets = [eulerAddresses.governance];
        const values = ['0'];
        const signatures = ['setIRM(address,uint256,bytes)'];
        const callDatas = [
            ethers.utils.defaultAbiCoder.encode(['address','uint256','bytes'], 
            [irm_params.DAI,irm_params.IRM_FIXED,Buffer.from('')])
        ];

        //check current IRM of token??
        // requires getter function for IRM in Euler repo

        // propose
        await govInstance.propose(targets, values, signatures, callDatas, 'set interest rate model', {from: owner});
        const proposalId = await govInstance.latestProposalIds(owner);
        let proposal = await govInstance.proposals(proposalId);
        // pending
        expectBignumberEqual(await govInstance.state(proposalId), PROPOSAL_STATES.Pending);
        await mineBlock();
        await mineBlock();
        // active
        expectBignumberEqual(await govInstance.state(proposalId), PROPOSAL_STATES.Active);
        await govInstance.castVote(proposalId, true, {from: wallet});
        await govInstance.castVote(proposalId, true, {from: wallet1});
        const afterFors = (await govInstance.proposals(proposalId)).forVotes;
        expectBignumberEqual(afterFors, parseEther('800002'));
        for (let i = 0; i<25; i++){
            await mineBlock();
        }
        // succeeded
        expectBignumberEqual(await govInstance.state(proposalId), PROPOSAL_STATES["Succeeded"])
        // queued
        await mineBlock()
        await govInstance.queue(proposalId, { from: wallet })
        expectBignumberEqual(await govInstance.state(proposalId), PROPOSAL_STATES["Queued"])

        let gracePeriod = await timelockInstance.GRACE_PERIOD()
        proposal = await govInstance.proposals(proposalId);
        let eta = etherUnsigned(proposal.eta)
        
        await freezeTime(eta.plus(gracePeriod).minus(1).toNumber())
        
        await increaseTo(eta.toString())
        await govInstance.execute(proposalId, { from: wallet })
        expectBignumberEqual(await govInstance.state(proposalId), PROPOSAL_STATES["Executed"])
        
        //check IRM of token is set??
        //requires getter function for IRM in Euler repo
    });

    it('should update asset config for DAI token by targeting Euler Governance contract via proposal', async () => {
        expect(await timelockInstance.admin()).to.be.equal(govInstance.address);
        expect(await govInstance.guardian()).to.be.equal(owner); 

        // const eulerGovernanceInstance =  await EulerGovernance.at(eulerAddresses.governance);
        // check euler governance governorAdmin is timelock contract
        // requires governorAdmin in Storage,sol to be public
        // expect(await eulerGovernanceInstance.governorAdmin()).to.be.equal(timelockInstance.address);

        const dai = eulerAddresses.tokens.DAI;
        // target contract addresses (proxies) not modules in .json addresses file
        const marketsInstance = await Markets.at(eulerAddresses.markets);

        // check current asset config for DAI
        const currentAssetConfig = await marketsInstance.underlyingToAssetConfig(dai);
        expect(currentAssetConfig.borrowIsolated).to.be.equal(false);
        expectBignumberEqual(toBN(currentAssetConfig.twapWindow), parseTwap(1800));
        
        // Get eToken address for DAI from Markets.sol
        // genenrates eTokenAddr => await marketsInstance.activateMarket(dai, {from: owner}); 
        const daiEToken = (await marketsInstance.underlyingToAssetConfig(dai)).eTokenAddress;
        const AssetConfig = {
            eTokenAddress: daiEToken, // should be eToken address
            borrowIsolated: true,
            collateralFactor: parseFactor(0.9),
            borrowFactor: parseFactor(0.2),
            twapWindow: parseTwap(900)
        };
        
        const configData = [AssetConfig.eTokenAddress,AssetConfig.borrowIsolated,AssetConfig.collateralFactor,AssetConfig.borrowFactor,AssetConfig.twapWindow];

        // create proposal data
        const targets = [eulerAddresses.governance];
        const values = ['0'];
        const signatures = ['setAssetConfig(address,(address,bool,uint32,uint32,uint24))'];
        const callDatas = [
            ethers.utils.defaultAbiCoder.encode(['address','(address,bool,uint32,uint32,uint24)'], 
            [dai,configData])
        ];

        // propose
        await govInstance.propose(targets, values, signatures, callDatas, 'set asset config', {from: owner});
        const proposalId = await govInstance.latestProposalIds(owner);
        let proposal = await govInstance.proposals(proposalId);
        // pending
        expectBignumberEqual(await govInstance.state(proposalId), PROPOSAL_STATES.Pending);
        await mineBlock();
        await mineBlock();
        
        // active
        expectBignumberEqual(await govInstance.state(proposalId), PROPOSAL_STATES.Active);
        await govInstance.castVote(proposalId, true, {from: wallet});
        await govInstance.castVote(proposalId, true, {from: wallet1});
        const afterFors = (await govInstance.proposals(proposalId)).forVotes;
        expectBignumberEqual(afterFors, parseEther('800002'));
        for (let i = 0; i<25; i++){
            await mineBlock();
        }
        // succeeded
        expectBignumberEqual(await govInstance.state(proposalId), PROPOSAL_STATES["Succeeded"]);
        
        // queue
        await mineBlock();
        await govInstance.queue(proposalId, { from: wallet });
        expectBignumberEqual(await govInstance.state(proposalId), PROPOSAL_STATES["Queued"]);

        let gracePeriod = await timelockInstance.GRACE_PERIOD();
        proposal = await govInstance.proposals(proposalId);
        let eta = etherUnsigned(proposal.eta);
        
        await freezeTime(eta.plus(gracePeriod).minus(1).toNumber());
        
        await increaseTo(eta.toString());
        await govInstance.execute(proposalId, { from: wallet });
        expectBignumberEqual(await govInstance.state(proposalId), PROPOSAL_STATES["Executed"]);
        
        //check asset config of DAI is set via executed proposal
        const updatedAssetConfig = await marketsInstance.underlyingToAssetConfig(dai);
        expect(updatedAssetConfig.borrowIsolated).to.be.equal(AssetConfig.borrowIsolated);
        expectBignumberEqual(toBN(updatedAssetConfig.twapWindow), AssetConfig.twapWindow);
    });

    /**Asset Config for DAI
     * address eTokenAddress;
        bool borrowIsolated;
        uint32 collateralFactor;
        uint32 borrowFactor;
        uint24 twapWindow;
     */

    //    function underlyingToAssetConfig(address underlying) external view returns (AssetConfig memory) {
    //    function setAssetConfig(address underlying, AssetConfig calldata newConfig) external nonReentrant governorOnly {

})
