const { shouldFailWithMessage, latest, duration } = require('../../../helpers/utils');
const { expectBignumberEqual, expect } = require('../../../helpers/index');
const { findEventInTransaction } = require('../../../helpers/events');
const { parseEther } = require('@ethersproject/units');

const ERC20VotesMock = artifacts.require('ERC20VotesMock');
const VestingFactory = artifacts.require('TreasuryVesterFactory');
const Vesting = artifacts.require('TreasuryVester');

contract('TreasuryVesterFactory: createVestingContract()', function (accounts) {
    const [owner, recipient] = accounts;

    const name = 'Euler';
    const symbol = 'EUL';
    const initialSupply = parseEther("1000");
    const vestingAmount = parseEther("100");
    let now, vestingBegin, vestingCliff, vestingEnd;

    beforeEach(async function () {
        this.token = await ERC20VotesMock.new(name, symbol);
        this.vestingFactory = await VestingFactory.new(
            this.token.address, // token
            accounts[1] // treasury
        );

        now = await latest();
        await this.token.mint(owner, initialSupply);
    });

    it('reverts if not called by owner', async function () {
        
    });

    it('can create single vesting contracts for recipient', async function () {
        
    });

    it('can create multiple vesting contracts for recipient', async function () {
        
    });

    it('reverts if vesting factory balance is less than vesting amount', async function () {
        
    });

    it('reverts after admin withdraws and vesting factory balance is less than vesting amount', async function () {
       
    });

    it('reverts from vesting contract if any constructor parameter(s) are rejected', async function () {
        
    });

    it('emits correct event and parameters', async function () {
        vestingBegin = now.add(await duration.minutes(5));
        vestingCliff = now.add(await duration.minutes(15));
        vestingEnd = now.add(await duration.minutes(25));

        await this.token.transfer(this.vestingFactory.address, vestingAmount);

        // static call
        // callStatic ethers
        // call web3
        let new_contract_data = await this.vestingFactory.createVestingContract.call(
            recipient,
            vestingAmount,
            vestingBegin,
            vestingCliff,
            vestingEnd
        )
        
        const tx = await this.vestingFactory.createVestingContract(
            recipient,
            vestingAmount,
            vestingBegin,
            vestingCliff,
            vestingEnd
        );
        const {args} = await findEventInTransaction(tx, 'NewVestingContract');
        expectBignumberEqual(args.index, new_contract_data.index_);
        expect(args.recipient).to.be.equal(new_contract_data.recipient_);
        expect(args.vestingContract).to.be.equal(new_contract_data.vestingContract_)
    });

    it('recipient can execute functions on vesting contract deployed from factory', async function () {
        
    });

})