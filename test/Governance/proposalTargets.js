const { expect } = require('chai');
const { artifacts } = require('hardhat');
const {
    deployGovernance
} = require('../helpers/deploy');
const {expectBignumberEqual} = require('../../helpers/index');
const { duration, increaseTo, latest, shouldFailWithMessage } = require('../../helpers/utils');
const { parseEther } = require('@ethersproject/units');

const Store = artifacts.require('Store');

describe('Governance and Timelock contracts: queueTransaction, executeTransaction', () => {
    let accounts;

    before(async () => {
        accounts = await web3.eth.getAccounts();
    });

    it('should update value in target contract with execute proposal call on non-view function', async () => {
        const [
            govInstance,
            {
                owner,
                timelockInstance
            }
        ] = await deployGovernance(accounts);

        const now = await latest();
        const delay = await timelockInstance.delay();
        const executionTimeStamp = now.add(delay).add(duration.minutes(1));

        expect(await timelockInstance.admin()).to.be.equal(owner);
        expect(await govInstance.guardian()).to.be.equal(owner);

        const _store = await Store.new(timelockInstance.address);

        expectBignumberEqual(await _store.getNum(), 0);
        
        const setNumber = 12;
        const targets = _store.address;
        const values = '0';
        const signatures = 'setNum(uint256)';
        const callDatas = ethers.utils.defaultAbiCoder.encode(['uint256'], [setNumber]);
        await timelockInstance.queueTransaction(targets, values, signatures, callDatas, executionTimeStamp, {from: owner});
        
        // ensure the ETA (Unix time) has been reached in the queueTransaction() call
        await increaseTo(executionTimeStamp);
        //await web3.eth.sendTransaction({to:timelockInstance.address, from:owner, value:web3.utils.toWei("10", "ether")});
        //await timelockInstance.cancelTransaction(timelockInstance.address, txFee, signature, callData, executionTimeStamp, {from: owner});

        await timelockInstance.executeTransaction(targets, values, signatures, callDatas, executionTimeStamp, {from: owner});

        expectBignumberEqual(await _store.getNum(), setNumber);
    });

    it('should update value in target contract with execute proposal call on payable non-view function', async () => {
        const [
            govInstance,
            {
                owner,
                timelockInstance
            }
        ] = await deployGovernance(accounts);

        const now = await latest();
        const delay = await timelockInstance.delay();
        const executionTimeStamp = now.add(delay).add(duration.minutes(1));

        expect(await timelockInstance.admin()).to.be.equal(owner);
        expect(await govInstance.guardian()).to.be.equal(owner);

        const _store = await Store.new(timelockInstance.address);

        expectBignumberEqual(await _store.getNum(), 0);
        
        const setNumber = 12;
        const targets = _store.address;
        const values = parseEther('1');
        const signatures = 'paySetNum(uint256)';
        const callDatas = ethers.utils.defaultAbiCoder.encode(['uint256'], [setNumber]);
        await timelockInstance.queueTransaction(targets, values, signatures, callDatas, executionTimeStamp, {from: owner});
        
        await increaseTo(executionTimeStamp);
    
        await timelockInstance.executeTransaction(targets, values, signatures, callDatas, executionTimeStamp, {from: owner, value: parseEther('1')});

        expectBignumberEqual(await _store.getNum(), setNumber);
    });

    it('should revert if ether is not sent upon executing proposal call on payable non-view function', async () => {
        const [
            govInstance,
            {
                owner,
                timelockInstance
            }
        ] = await deployGovernance(accounts);

        const now = await latest();
        const delay = await timelockInstance.delay();
        const executionTimeStamp = now.add(delay).add(duration.minutes(1));

        expect(await timelockInstance.admin()).to.be.equal(owner);
        expect(await govInstance.guardian()).to.be.equal(owner);

        const _store = await Store.new(timelockInstance.address);

        expectBignumberEqual(await _store.getNum(), 0);
        
        const setNumber = 12;
        const targets = _store.address;
        const values = parseEther('1');
        const signatures = 'paySetNum(uint256)';
        const callDatas = ethers.utils.defaultAbiCoder.encode(['uint256'], [setNumber]);
        await timelockInstance.queueTransaction(targets, values, signatures, callDatas, executionTimeStamp, {from: owner});
        
        await increaseTo(executionTimeStamp);
 
        await shouldFailWithMessage(
            timelockInstance.executeTransaction(targets, values, signatures, callDatas, executionTimeStamp, {from: owner}),
            'Timelock::executeTransaction: Transaction execution reverted'
        );

        expectBignumberEqual(await _store.getNum(), 0);
    });

    it('should revert if incorrect amount of ether is sent upon executing proposal call on payable non-view function', async () => {
        const [
            govInstance,
            {
                owner,
                timelockInstance
            }
        ] = await deployGovernance(accounts);

        const now = await latest();
        const delay = await timelockInstance.delay();
        const executionTimeStamp = now.add(delay).add(duration.minutes(1));

        expect(await timelockInstance.admin()).to.be.equal(owner);
        expect(await govInstance.guardian()).to.be.equal(owner);

        const _store = await Store.new(timelockInstance.address);

        expectBignumberEqual(await _store.getNum(), 0);
        
        const setNumber = 12;
        const targets = _store.address;
        const values = parseEther('1');
        const signatures = 'paySetNum(uint256)';
        const callDatas = ethers.utils.defaultAbiCoder.encode(['uint256'], [setNumber]);
        await timelockInstance.queueTransaction(targets, values, signatures, callDatas, executionTimeStamp, {from: owner});
        
        await increaseTo(executionTimeStamp);
    
        await shouldFailWithMessage(
            timelockInstance.executeTransaction(targets, values, signatures, callDatas, executionTimeStamp, {from: owner, value: parseEther('0.1')}),
            'Timelock::executeTransaction: Transaction execution reverted'
        );

        expectBignumberEqual(await _store.getNum(), 0);
    });
});
