const { expect } = require('chai');
const { artifacts } = require('hardhat');
const { ZERO_ADDRESS, getActorsAsync } = require('../../helpers/address');
const {
    deployEulerToken,
    deployGovernance,
    deployTimeLock
} = require('../helpers/deploy');
const {expectBignumberEqual} = require('../../helpers/index');
const { duration, increaseTo, latest, shouldFailWithMessage } = require('../../helpers/utils');
const { time } = require('@openzeppelin/test-helpers');
const { parseEther } = require('@ethersproject/units');

const Store = artifacts.require('Store');

describe('Governance and Timelock contracts: queueTransaction, executeTransaction and __acceptAdmin', () => {
    let accounts;

    before(async () => {
        accounts = await web3.eth.getAccounts();
    });

    it('should set value in target contract with execute proposal', async () => {
        const [
            govInstance,
            {
                owner,
                timelockInstance,
                eulerTokenInstance
            }
        ] = await deployGovernance(accounts);

        const now = await latest();
        const delay = await timelockInstance.delay();
        const executionTimeStamp = now.add(delay).add(duration.minutes(1));

        expect(await timelockInstance.admin()).to.be.equal(owner);
        expect(await govInstance.guardian()).to.be.equal(owner);

        // timelock execute proposal fails when 
        // function signature does not exist in target contract
        // DOES NOT WORK WITH PARAM TO ENCODE AS UINT
        // no uint param found in proposals on 
        // Compound timelock dashboard https://app.compound.finance/timelock
        // timelock is the caller of target contracts in proposals
        // governance contract with governance logic 
        // is the admin of timelock
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

    it('should set governance as admin in timelock', async () => {
        //https://opentaps.org/2021/03/24/tutorial-how-to-customize-and-deploy-compound-dao/
        const [
            govInstance,
            {
                owner,
                timelockInstance,
                eulerTokenInstance
            }
        ] = await deployGovernance(accounts);

        const now = await latest();
        const delay = await timelockInstance.delay();
        const executionTimeStamp = now.add(delay).add(duration.minutes(1));
        
        const setAdmin = govInstance.address;
        const targets = timelockInstance.address;
        const values = '0';
        const signatures = 'setPendingAdmin(address)';
        const callDatas = ethers.utils.defaultAbiCoder.encode(['address'], [setAdmin]);
        
        expect(await timelockInstance.admin()).to.be.equal(owner);

        // queue setPendingAdmin() on Timelock
        await timelockInstance.queueTransaction(targets, values, signatures, callDatas, executionTimeStamp, {from: owner});

        // execute setPendingAdmin() - After the ETA is reached, call executeTransaction() on the Timelock contract using the owner wallet to execute setPendingAdmin() using the arguments
        await increaseTo(executionTimeStamp);
        
        await timelockInstance.executeTransaction(targets, values, signatures, callDatas, executionTimeStamp, {from: owner});
        
        // Now pendingAdmin on the Timelock is set to the Governor (and we can check via Etherscan), but we still need to call acceptAdmin() on the Timelock from the Governor to complete the transfer. Luckily, there is a helpful function on the Governor to do this without a proposal. On the Governor contract using the admin/guardian account, call __acceptAdmin() to complete the switch from the pending admin to the admin.
        // _acceptAdmin() on Governance
        expect(await timelockInstance.pendingAdmin()).to.be.equal(govInstance.address);
        
        await govInstance.__acceptAdmin({from: owner});

        expect(await timelockInstance.pendingAdmin()).to.be.equal(ZERO_ADDRESS);
        expect(await timelockInstance.admin()).to.be.equal(govInstance.address);

        // Now that the admin of the Timelock contract is set to the Governor, 
        // proposals can be queued and executed directly on the Governor 
        // using queue() and execute() after reaching an “Accepted” 
        // state rather than directly queuing executions to the 
        // Timelock contracts and bypassing the governance mechanism 
        // altogether.
    })

    it('should revert if non admin tries to queue tx directly', async () => {
        const {firstUser} = await getActorsAsync();
        const [
            govInstance,
            {
                owner,
                timelockInstance,
                eulerTokenInstance
            }
        ] = await deployGovernance(accounts);

        const now = await latest();
        const delay = await timelockInstance.delay();
        const executionTimeStamp = now.add(delay).add(duration.minutes(1));
        
        const setAdmin = govInstance.address;
        const targets = timelockInstance.address;
        const values = '0';
        const signatures = 'setPendingAdmin(address)';
        const callDatas = ethers.utils.defaultAbiCoder.encode(['address'], [setAdmin]);
        
        expect(await timelockInstance.admin()).to.be.equal(owner);

        // should revert - queue setPendingAdmin() on Timelock
        await shouldFailWithMessage(
            timelockInstance.queueTransaction(targets, values, signatures, callDatas, executionTimeStamp, {from: firstUser}),
            'Timelock::queueTransaction: Call must come from admin.'
        );
    });

    it('should revert if non admin tries to execute tx directly', async () => {
        const {firstUser} = await getActorsAsync();
        const [
            govInstance,
            {
                owner,
                timelockInstance,
                eulerTokenInstance
            }
        ] = await deployGovernance(accounts);

        const now = await latest();
        const delay = await timelockInstance.delay();
        const executionTimeStamp = now.add(delay).add(duration.minutes(1));
        
        const setAdmin = govInstance.address;
        const targets = timelockInstance.address;
        const values = '0';
        const signatures = 'setPendingAdmin(address)';
        const callDatas = ethers.utils.defaultAbiCoder.encode(['address'], [setAdmin]);
        
        expect(await timelockInstance.admin()).to.be.equal(owner);

        // queue setPendingAdmin() on Timelock
        await timelockInstance.queueTransaction(targets, values, signatures, callDatas, executionTimeStamp, {from: owner});

        // execute setPendingAdmin() - After the ETA is reached, call executeTransaction() on the Timelock contract using the owner wallet to execute setPendingAdmin() using the arguments
        await increaseTo(executionTimeStamp);
        
        // should revert
        await shouldFailWithMessage(
            timelockInstance.executeTransaction(targets, values, signatures, callDatas, executionTimeStamp, {from: firstUser}),
            'Timelock::executeTransaction: Call must come from admin.'
        );  
    });

    it('should revert if non admin tries call accept admin', async () => {
        const {firstUser} = await getActorsAsync();
        const [
            govInstance,
            {
                owner,
                timelockInstance,
                eulerTokenInstance
            }
        ] = await deployGovernance(accounts);

        const now = await latest();
        const delay = await timelockInstance.delay();
        const executionTimeStamp = now.add(delay).add(duration.minutes(1));
        
        const setAdmin = govInstance.address;
        const targets = timelockInstance.address;
        const values = '0';
        const signatures = 'setPendingAdmin(address)';
        const callDatas = ethers.utils.defaultAbiCoder.encode(['address'], [setAdmin]);
        
        expect(await timelockInstance.admin()).to.be.equal(owner);

        // queue setPendingAdmin() on Timelock
        await timelockInstance.queueTransaction(targets, values, signatures, callDatas, executionTimeStamp, {from: owner});

        // execute setPendingAdmin() - After the ETA is reached, call executeTransaction() on the Timelock contract using the owner wallet to execute setPendingAdmin() using the arguments
        await increaseTo(executionTimeStamp);
        
        await timelockInstance.executeTransaction(targets, values, signatures, callDatas, executionTimeStamp, {from: owner});
        
        // Now pendingAdmin on the Timelock is set to the Governor (and we can check via Etherscan), but we still need to call acceptAdmin() on the Timelock from the Governor to complete the transfer. Luckily, there is a helpful function on the Governor to do this without a proposal. On the Governor contract using the admin/guardian account, call __acceptAdmin() to complete the switch from the pending admin to the admin.
        // _acceptAdmin() on Governance
        expect(await timelockInstance.pendingAdmin()).to.be.equal(govInstance.address);
        
        // should revert
        await shouldFailWithMessage(
            govInstance.__acceptAdmin({from: firstUser}),
            'Governance::__acceptAdmin: sender must be gov guardian'
        );
    });
});
