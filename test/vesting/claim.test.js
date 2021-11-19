const { BN, constants, expectEvent, expectRevert, time } = require('@openzeppelin/test-helpers');
const { duration, increase, increaseTo } = require('@openzeppelin/test-helpers/src/time');
const { expect } = require('chai');
const { expectBignumberEqual } = require('../../helpers');
const { toBN, latest, shouldFailWithMessage } = require('../../helpers/utils');
const { findEventInTransaction } = require('../../helpers/events');
const { web3 } = require('@openzeppelin/test-helpers/src/setup');
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
        
        now = await latest();
        const amount_to_receive = vestingAmount.mul(now.sub(lastUpdate)).div(vestingEnd.sub(vestingBegin)); 
        await this.vesting.claim({ from: recipient });
        expectBignumberEqual(await this.token.balanceOf(recipient), amount_to_receive);
        expectBignumberEqual(await this.token.balanceOf(this.vesting.address), vestingAmount.sub(amount_to_receive));
    })

    it('anyone can call claim() but only recipient should receive vested tokens', async function () {
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
        
        expectBignumberEqual(await this.token.balanceOf(owner), 0);
        
        await this.vesting.claim({ from: owner });
        expectBignumberEqual(await this.token.balanceOf(owner), 0);
        expectBignumberEqual(await this.token.balanceOf(recipient), amount_to_receive);
        expectBignumberEqual(await this.token.balanceOf(this.vesting.address), vestingAmount.sub(amount_to_receive));
    })


    it('should receive total amount vested if block.timestamp >= vestingEnd', async function () {
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

        /* 
        // checking for Transfer event logs
        // IERC20Votes(eul).transfer(recipient, amount);
        // Transfer(address indexed from, address indexed to, uint256 value)
        console.log(tx.receipt)
        // await web3.eth.abi.decodeLog(inputs, hexString, topics);
        await web3.eth.abi.decodeLog(
            [{
                type: 'address',
                name: 'from',
                indexed: true
            },{
                type: 'address',
                name: 'to',
                indexed: true
            },{
                type: 'uint256',
                name: 'value'
            }],
            '0x000000000000000000000000000000000000000000000000000000000000000f',
            [
                '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',
                '0x0000000000000000000000000dcd1bf9a1b36ce34237eeafef220932846bcd82',
                '0x00000000000000000000000070997970c51812dc3a010c7d01b50e0d17dc79c8'
            ]
        ) 
        */
    })
    
});