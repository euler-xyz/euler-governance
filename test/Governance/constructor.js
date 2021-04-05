const { expect } = require('chai');
const { artifacts } = require('hardhat');
const { ZERO_ADDRESS } = require('../../helpers/address');
const {
    deployEulerToken,
    deployGovernance,
    deployTimeLock
} = require('../helpers/deploy');
const {expectBignumberEqual} = require('../../helpers/index');

describe('Governance contracts: deployment tests', () => {
    let accounts;

    before(async () => {
        accounts = await web3.eth.getAccounts();
    });

    describe("Deployment", function () {
        it('should deploy timelock correctly', async () => {
            const [timelockInstance, { owner }] = await deployTimeLock(accounts);

            const adminRole = await timelockInstance.admin();

            expect(timelockInstance.address).to.not.be.equal(undefined);
            expect(timelockInstance.address).to.not.be.equal(ZERO_ADDRESS);
            expect(adminRole).to.be.equal(owner);
        });

        it('should deploy euler token correctly', async () => {
            it('should deploy euler token correctly', async () => {
                const [eulerTokenInstance, { owner }] = await deployEulerToken(accounts);
                
                expect(eulerTokenInstance.address).to.not.be.equal(undefined);
                expect(eulerTokenInstance.address).to.not.be.equal(ZERO_ADDRESS);
                expect(owner).to.not.be.equal(ZERO_ADDRESS);

                const totalSupply = await eulerTokenInstance.totalSupply();
                const ownerBalance = await eulerTokenInstance.balanceOf(owner);
                expectBignumberEqual(totalSupply, ownerBalance);
            });
        });

        it('should deploy governance correctly', async () => {
            const [
                govInstance,
                {
                    owner,
                    timelockInstance,
                    eulerTokenInstance
                }
            ] = await deployGovernance(accounts);

            expect(govInstance.address).to.not.be.equal(undefined);
            expect(govInstance.address).to.not.be.equal(ZERO_ADDRESS);
            expect(timelockInstance.address).to.not.be.equal(undefined);
            expect(timelockInstance.address).to.not.be.equal(ZERO_ADDRESS);
            expect(eulerTokenInstance.address).to.not.be.equal(undefined);
            expect(eulerTokenInstance.address).to.not.be.equal(ZERO_ADDRESS);
        });
    })
});
