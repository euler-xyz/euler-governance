const { BN, constants, expectEvent, expectRevert, time } = require('@openzeppelin/test-helpers');
const { duration } = require('@openzeppelin/test-helpers/src/time');
const { expect } = require('chai');
const { expectBignumberEqual } = require('../../helpers');
const { toBN, latest, shouldFailWithMessage } = require('../../helpers/utils');
const { findEventInTransaction } = require('../../helpers/events');
const { MAX_UINT256, ZERO_ADDRESS, ZERO_BYTES32 } = constants;

const ERC20VotesMock = artifacts.require('ERC20VotesMock');
const Vesting = artifacts.require('TreasuryVester');

contract('TreasuryVester: setRecipient', function (accounts) {
    const [owner, recipient, otherAccount] = accounts;

    const name = 'Euler';
    const symbol = 'EUL';
    const initialSupply = new BN(200);
    const vestingAmount = new BN(15);
    let now, vestingBegin, vestingCliff, vestingEnd;

    beforeEach(async function () {
        this.token = await ERC20VotesMock.new(name, symbol);
        now = await latest();
        vestingBegin = now.add(await duration.minutes(5));
        vestingCliff = now.add(await duration.minutes(15));
        vestingEnd = now.add(await duration.minutes(25));
        this.vesting = await Vesting.new(
            this.token.address,
            recipient,
            vestingAmount,
            vestingBegin,
            vestingCliff,
            vestingEnd
        );
    });

    it('revert if non recipent is function caller', async function () {
        await shouldFailWithMessage(
            this.vesting.delegate(otherAccount, { from: owner }),
            "TreasuryVester::delegate: unauthorized"
        );
    });

    it('allow current recipent to execute delegate function with zero funds', async function () {
        expect(await this.token.delegates(this.vesting.address)).to.equal(ZERO_ADDRESS);

        await this.vesting.delegate(otherAccount, { from: recipient });

        expect(await this.token.delegates(this.vesting.address)).to.equal(otherAccount);

        expectBignumberEqual(await this.token.getVotes(otherAccount), 0);
    });

    it('allow current recipent to execute delegate function with funds', async function () {
        expect(await this.token.delegates(this.vesting.address)).to.equal(ZERO_ADDRESS);

        await this.token.mint(this.vesting.address, vestingAmount);

        await this.vesting.delegate(otherAccount, { from: recipient });

        expect(await this.token.delegates(this.vesting.address)).to.equal(otherAccount);

        expectBignumberEqual(await this.token.getVotes(otherAccount), vestingAmount);
    });

});