const { BN, expectEvent, expectRevert } = require('@openzeppelin/test-helpers');
const { ZERO_ADDRESS } = require('@openzeppelin/test-helpers/src/constants');
const { expect } = require('chai');

const Stub = artifacts.require('GovernanceStub');

contract('GovernanceStub', function (accounts) {
    const [ owner, governor, user1, user2] = accounts;

    it('deployment check', async function () {
        this.stub = await Stub.new(governor);
        expect(this.stub.address).to.not.be.equal(ZERO_ADDRESS);
        expect(await this.stub.governor()).to.be.equal(governor);
    })
    it('executeProposal reverts if not governor', async function () {})
    it('executeProposal emits correct event and event parameters', async function () {})
    it('can correctly debug bytes from proposal executed event', async function () {})
});