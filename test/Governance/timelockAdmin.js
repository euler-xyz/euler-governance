const { expect } = require('chai');
const { artifacts } = require('hardhat');
const { ZERO_ADDRESS } = require('../../helpers/address');
const {
    deployEulerToken,
    deployGovernance,
    deployTimeLock
} = require('../helpers/deploy');
const {expectBignumberEqual} = require('../../helpers/index');
const { duration, increaseTo, latest } = require('../../helpers/utils');
const { time } = require('@openzeppelin/test-helpers');
const { parseEther } = require('@ethersproject/units');

describe('Governance contracts: set timelock admin', () => {
    let accounts;

    before(async () => {
        accounts = await web3.eth.getAccounts();
    });

    describe("Timelock Admin", () => {
        it('should set governance as admin in timelock correctly', async () => {
            const [
                govInstance,
                {
                    owner,
                    timelockInstance,
                    eulerTokenInstance
                }
            ] = await deployGovernance(accounts);

            const txFee = parseEther('50');
            const now = await latest();
            const delay = await timelockInstance.delay();
            const executionTimeStamp = now.add(delay).add(duration.minutes(1));

            expect(await timelockInstance.admin()).to.be.equal(owner);
            expect(await govInstance.guardian()).to.be.equal(owner);
            
            const callData = ethers.utils.defaultAbiCoder.encode(['address'], [govInstance.address])
            await timelockInstance.queueTransaction(timelockInstance.address, txFee, 'setPendingAdmin(address)', callData, executionTimeStamp, {from: owner});

            await increaseTo(executionTimeStamp);
            await timelockInstance.executeTransaction(timelockInstance.address, txFee, 'setPendingAdmin(address)', callData, executionTimeStamp, {from: owner, value: txFee});
        });
    })
});
