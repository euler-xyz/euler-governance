const { BN, constants, expectEvent, expectRevert, time } = require('@openzeppelin/test-helpers');
const { duration, increase, increaseTo } = require('@openzeppelin/test-helpers/src/time');
const { expect } = require('chai');
const { expectBignumberEqual } = require('../../helpers');
const { toBN, latest, shouldFailWithMessage } = require('../../helpers/utils');
const { findEventInTransaction } = require('../../helpers/events');
const { MAX_UINT256, ZERO_ADDRESS, ZERO_BYTES32 } = constants;

const ERC20VotesMock = artifacts.require('ERC20VotesMock');
const Vesting = artifacts.require('TreasuryVester');

contract('TreasuryVester: claim', function (accounts) {
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

    it('revert if vesting cliff timestamp is not reached', async function () {
        let now = await latest();
        
        expect(now).to.be.bignumber.lessThan(vestingCliff);

        await shouldFailWithMessage(
            this.vesting.claim({ from: owner }),
            "TreasuryVester::claim: not time yet"
        );
    });

    it('revert if no funds in vesting contract', async function () {
        let now = await latest();
        
        expect(now).to.be.bignumber.lessThan(vestingCliff);

        await increaseTo(vestingCliff);
        await increase(1);

        now = await latest();

        // vesting cliff timestamp has passed at this point
        expect(now).to.be.bignumber.greaterThan(vestingCliff);

        await shouldFailWithMessage(
            this.vesting.claim({ from: recipient }),
            "ERC20: transfer amount exceeds balance"
        );
    });

    it('should receive tokens greater than 0 after vesting cliff elapses', async function () {
        // amount to receive = vestingAmount.mul(block.timestamp - lastUpdate).div(vestingEnd - vestingBegin); 
        
        let now = await latest();
        
        expect(now).to.be.bignumber.lessThan(vestingCliff);

        await increaseTo(vestingCliff);
        await increase(1);

        now = await latest();

        // vesting cliff timestamp has passed at this point
        expect(now).to.be.bignumber.greaterThan(vestingCliff);

        expectBignumberEqual(await this.token.balanceOf(recipient), 0);
        expectBignumberEqual(await this.token.balanceOf(this.vesting.address), 0);

        await this.token.mint(this.vesting.address, vestingAmount);
        expectBignumberEqual(await this.token.balanceOf(this.vesting.address), vestingAmount);

        let lastUpdate = await this.vesting.lastUpdate();
        let amount_received;
        
        now = await latest();
        const amount_to_receive = vestingAmount.mul(now.sub(lastUpdate)).div(vestingEnd.sub(vestingBegin)); 
        await this.vesting.claim({ from: recipient });
        expectBignumberEqual(await this.token.balanceOf(recipient), amount_to_receive);
        expectBignumberEqual(await this.token.balanceOf(this.vesting.address), vestingAmount.sub(amount_to_receive));
    })

    // anyone can call claim() but definitely only recipient receives vested tokens
    // receive total amount vested if block.timestamp >= vestingEnd
    // check transfer event - IERC20Votes(eul).transfer(recipient, amount);


    // governance 
    // can create proposal using delegation (if vested amount meets proposal threshold)
    // reverts upon create proposal using delegation (if vested amount does not meet proposal threshold)
    // can vote on proposal using delegation
});