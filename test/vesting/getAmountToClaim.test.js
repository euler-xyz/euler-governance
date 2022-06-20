const { BN, constants, expectEvent, expectRevert, time } = require('@openzeppelin/test-helpers');
const { duration, increase, increaseTo } = require('@openzeppelin/test-helpers/src/time');
const { expect } = require('chai');
const { expectBignumberEqual } = require('../../helpers');
const { toBN, latest, shouldFailWithMessage } = require('../../helpers/utils');
const { findEventInTransaction } = require('../../helpers/events');
const { web3 } = require('@openzeppelin/test-helpers/src/setup');
const { MAX_UINT256, ZERO_ADDRESS, ZERO_BYTES32 } = constants;

const ERC20VotesMock = artifacts.require('ERC20VotesMock');
const Vesting = artifacts.require('MockTreasuryVester');

contract('TreasuryVester: getAmountToClaim', function (accounts) {
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


    it('should release the correct amount of tokens after vesting cliff elapses', async function () {
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
        
        now = await latest();
        const amount_to_receive = vestingAmount.mul(now.sub(lastUpdate)).div(vestingEnd.sub(vestingBegin)); 
        expect(amount_to_receive).to.be.bignumber.equal(await this.vesting.getAmountToClaim());
        
        await this.vesting.claim({ from: recipient });
        expectBignumberEqual(await this.token.balanceOf(recipient), amount_to_receive);
        expectBignumberEqual(await this.token.balanceOf(this.vesting.address), vestingAmount.sub(amount_to_receive));
    });

    it('should return zero for amount to claim if block.timestamp >= vestingEnd', async function () {
        let now = await latest();
        
        expect(now).to.be.bignumber.lessThan(vestingEnd);

        await increaseTo(vestingEnd);
        await increase(1);

        now = await latest();

        // vesting end timestamp has passed at this point
        expect(now).to.be.bignumber.greaterThan(vestingEnd);

        await this.token.mint(this.vesting.address, vestingAmount);

        const tx = await this.vesting.claim({ from: owner });
        expectBignumberEqual(await this.token.balanceOf(recipient), vestingAmount);
        expectBignumberEqual(await this.token.balanceOf(this.vesting.address), 0);

        expectBignumberEqual(
            await this.vesting.getAmountToClaim(),
            0
        );

    });

    it('should not update lastUpdate if amount to claim is zero after calling claim', async function () {
        let now = await latest();
        
        expect(now).to.be.bignumber.lessThan(vestingEnd);

        await increaseTo(vestingEnd);
        await increase(1);

        now = await latest();

        // vesting end timestamp has passed at this point
        expect(now).to.be.bignumber.greaterThan(vestingEnd);

        await this.token.mint(this.vesting.address, vestingAmount);

        const tx = await this.vesting.claim({ from: owner });
        expectBignumberEqual(await this.token.balanceOf(recipient), vestingAmount);
        expectBignumberEqual(await this.token.balanceOf(this.vesting.address), 0);
        
        const lastUpdateTimeStamp = await this.vesting.lastUpdate();

        expectBignumberEqual(
            await this.vesting.getAmountToClaim(),
            0
        );

        await this.vesting.claim({ from: owner });

        expectBignumberEqual(
            await this.vesting.lastUpdate(),
            lastUpdateTimeStamp
        );

    });

});