const { shouldFailWithMessage, latest, duration, toBN, increaseTo, increase } = require('../../../helpers/utils');
const { expectBignumberEqual, expect } = require('../../../helpers/index');
const { findEventInTransaction } = require('../../../helpers/events');
const { parseEther } = require('@ethersproject/units');
const { ZERO_ADDRESS } = require('@openzeppelin/test-helpers/src/constants');
const { ethers } = require('ethers');

const ERC20VotesMock = artifacts.require('ERC20VotesMock');
const VestingFactory = artifacts.require('TreasuryVesterFactory'); // artifacts.require('TreasuryVesterFactory');
const Vesting = artifacts.require('TreasuryVester');

contract('TreasuryVesterFactory: createVestingContract()', function (accounts) {
    const [owner, treasury, recipient, otherAddress, recipient2] = accounts;

    const name = 'Euler';
    const symbol = 'EUL';
    const initialSupply = parseEther("1000");
    const vestingAmount = parseEther("100");
    let now, vestingBegin, vestingCliff, vestingEnd;

    beforeEach(async function () {
        this.token = await ERC20VotesMock.new(name, symbol);
        this.vestingFactory = await VestingFactory.new(
            this.token.address, // token
            treasury // treasury
        );

        now = await latest();
        await this.token.mint(owner, initialSupply);
    });

    /**
        address recipient - is the EOA / wallet address of the recipient of the vested tokens 
        uint vestingAmount - is the amount to be vested (in Wei as EUL token is also 18 decimals like ETH, e.g., 1 EUL will be 10 * (10 ** 18))

        uint vestingBegin - this is the unix timestamp for when vesting period will start which should be after latest block timestamp. e.g., 1638262715 (this web app converts date and time to unix timestamp https://www.unixtimestamp.com)

        uint vestingCliff - this is the timestamp at which the recipient can begin collecting vested funds from the vesting contract. The amount that can be collected at any point in time between vestingCliff and vestingEnd is calculated on this line in the Vesting Contract - https://github.com/euler-xyz/euler-governance/blob/d2d66e40984e0e04f96d770993a436396a4cde32/contracts/vesting/TreasuryVester.sol#L52 
        amount vested * (timestamp of latest block - timestamp of the last time funds were collected) / (vestingEnd - vestingBegin)

        uint vestingEnd - this is the unix timestamp of when the vesting period will end. After this timestamp, the recipient can withdraw or collect all of the remaining vested amount
     */

    it('create vesting contract and revoke admin role afterwards', async function () {
        vestingBegin = now.add(await duration.minutes(5));
        vestingCliff = now.add(await duration.minutes(15));
        vestingEnd = now.add(await duration.minutes(25));

        await this.token.transfer(this.vestingFactory.address, vestingAmount);
        
        await this.vestingFactory.createVestingContract(
            recipient,
            vestingAmount,
            vestingBegin,
            vestingCliff,
            vestingEnd
        );

        expectBignumberEqual(
            (await this.vestingFactory.getVestingContracts(recipient)).length,
            1
        );

        expect(await this.vestingFactory.getVestingContract(recipient, 0)).to.not.be.equal(ZERO_ADDRESS);

        const adminRole = await this.vestingFactory.ADMIN_ROLE();
        const defaultAdminRole = await this.vestingFactory.DEFAULT_ADMIN_ROLE();

        // should revert with AccessControl: account 0x90f79bf6eb2c4f870365e785982e1f101e93b906 is missing role 0x0000000000000000000000000000000000000000000000000000000000000000
        await shouldFailWithMessage(
            this.vestingFactory.revokeRole(adminRole, owner, {from: otherAddress}),
            // convert to non checksum address to prevent test failing
            `AccessControl: account ${otherAddress.toString().toLowerCase()} is missing role ${defaultAdminRole}`
        );

        await this.vestingFactory.revokeRole(adminRole, owner, {from: treasury});

        await shouldFailWithMessage(
            this.vestingFactory.createVestingContract(
                recipient,
                vestingAmount,
                vestingBegin,
                vestingCliff,
                vestingEnd,
                {from: owner}
            ), 
            'Caller does not have the ADMIN_ROLE'
        );
    });

    it('revoke admin role and reassign to another address and perform admin action', async function () {
        vestingBegin = now.add(await duration.minutes(5));
        vestingCliff = now.add(await duration.minutes(15));
        vestingEnd = now.add(await duration.minutes(25));

        await this.token.transfer(this.vestingFactory.address, vestingAmount);
        
        await this.vestingFactory.createVestingContract(
            recipient,
            vestingAmount,
            vestingBegin,
            vestingCliff,
            vestingEnd
        );

        expectBignumberEqual(
            (await this.vestingFactory.getVestingContracts(recipient)).length,
            1
        );

        expect(await this.vestingFactory.getVestingContract(recipient, 0)).to.not.be.equal(ZERO_ADDRESS);

        const adminRole = await this.vestingFactory.ADMIN_ROLE();
        const defaultAdminRole = await this.vestingFactory.DEFAULT_ADMIN_ROLE();

        // should revert with AccessControl: account 0x90f79bf6eb2c4f870365e785982e1f101e93b906 is missing role 0x0000000000000000000000000000000000000000000000000000000000000000
        await shouldFailWithMessage(
            this.vestingFactory.revokeRole(adminRole, owner, {from: otherAddress}),
            // convert to non checksum address to prevent test failing
            `AccessControl: account ${otherAddress.toString().toLowerCase()} is missing role ${defaultAdminRole}`
        );

        await this.vestingFactory.revokeRole(adminRole, owner, {from: treasury});

        await shouldFailWithMessage(
            this.vestingFactory.createVestingContract(
                recipient,
                vestingAmount,
                vestingBegin,
                vestingCliff,
                vestingEnd,
                {from: owner}
            ), 
            'Caller does not have the ADMIN_ROLE'
        );

        await this.vestingFactory.grantRole(adminRole, otherAddress, {from: treasury});

        await this.token.transfer(this.vestingFactory.address, vestingAmount);
        
        await this.vestingFactory.createVestingContract(
            recipient,
            vestingAmount,
            vestingBegin,
            vestingCliff,
            vestingEnd,
            {from: otherAddress}
        );

        expectBignumberEqual(
            (await this.vestingFactory.getVestingContracts(recipient)).length,
            2
        );

        expect(await this.vestingFactory.getVestingContract(recipient, 1)).to.not.be.equal(ZERO_ADDRESS);

    });

    it('reverts if not called by admin', async function () {
        vestingBegin = now.add(await duration.minutes(5));
        vestingCliff = now.add(await duration.minutes(15));
        vestingEnd = now.add(await duration.minutes(25));

        await this.token.transfer(this.vestingFactory.address, vestingAmount);

        /* let errMsg;
        try {
            await this.vestingFactory.createVestingContract(
                recipient,
                vestingAmount,
                vestingBegin,
                vestingCliff,
                vestingEnd,
                {from: recipient}
            );
        } catch (e) {
            errMsg = e.message;
        }
        expect(errMsg).to.contain('Caller does not have the ADMIN_ROLE'); */
        // console.log(accounts)
        await shouldFailWithMessage(
            this.vestingFactory.createVestingContract(
                recipient,
                vestingAmount,
                vestingBegin,
                vestingCliff,
                vestingEnd,
                {from: accounts[2]}
            ), 
            'Caller does not have the ADMIN_ROLE'
        );

        expectBignumberEqual(
            (await this.vestingFactory.getVestingContracts(recipient)).length,
            0
        );

        await shouldFailWithMessage(
            this.vestingFactory.vestingContracts(recipient, 0),
            "revert"
        );
    });

    it('can create single vesting contract for recipient', async function () {
        vestingBegin = now.add(await duration.minutes(5));
        vestingCliff = now.add(await duration.minutes(15));
        vestingEnd = now.add(await duration.minutes(25));

        await this.token.transfer(this.vestingFactory.address, vestingAmount);
        
        await this.vestingFactory.createVestingContract(
            recipient,
            vestingAmount,
            vestingBegin,
            vestingCliff,
            vestingEnd
        );

        expectBignumberEqual(
            (await this.vestingFactory.getVestingContracts(recipient)).length,
            1
        );

        expect(await this.vestingFactory.getVestingContract(recipient, 0)).to.not.be.equal(ZERO_ADDRESS);
    });

    it('can create multiple vesting contracts for single recipient', async function () {
        vestingBegin = now.add(await duration.minutes(5));
        vestingCliff = now.add(await duration.minutes(15));
        vestingEnd = now.add(await duration.minutes(25));

        await this.token.transfer(this.vestingFactory.address, vestingAmount.mul(2));
        
        await this.vestingFactory.createVestingContract(
            recipient,
            vestingAmount,
            vestingBegin,
            vestingCliff,
            vestingEnd
        );
        
        expectBignumberEqual(
            (await this.vestingFactory.getVestingContracts(recipient)).length,
            1
        );

        await this.vestingFactory.createVestingContract(
            recipient,
            vestingAmount,
            vestingBegin,
            vestingCliff,
            vestingEnd
        );

        expectBignumberEqual(
            (await this.vestingFactory.getVestingContracts(recipient)).length,
            2
        );
    });

    it('can create multiple vesting contracts for multiple recipients', async function () {
        vestingBegin = now.add(await duration.minutes(5));
        vestingCliff = now.add(await duration.minutes(15));
        vestingEnd = now.add(await duration.minutes(25));

        await this.token.transfer(this.vestingFactory.address, vestingAmount.mul(4));
        
        await this.vestingFactory.createVestingContract(
            recipient,
            vestingAmount,
            vestingBegin,
            vestingCliff,
            vestingEnd
        );
        
        expectBignumberEqual(
            (await this.vestingFactory.getVestingContracts(recipient)).length,
            1
        );

        await this.vestingFactory.createVestingContract(
            recipient,
            vestingAmount,
            vestingBegin,
            vestingCliff,
            vestingEnd
        );

        expectBignumberEqual(
            (await this.vestingFactory.getVestingContracts(recipient)).length,
            2
        );

        await this.vestingFactory.createVestingContract(
            recipient2,
            vestingAmount,
            vestingBegin,
            vestingCliff,
            vestingEnd
        );

        expectBignumberEqual(
            (await this.vestingFactory.getVestingContracts(recipient2)).length,
            1
        );

        await this.vestingFactory.createVestingContract(
            recipient2,
            vestingAmount,
            vestingBegin,
            vestingCliff,
            vestingEnd
        );

        expectBignumberEqual(
            (await this.vestingFactory.getVestingContracts(recipient2)).length,
            2
        );
    });

    it('reverts if vesting factory balance is less than vesting amount', async function () {
        vestingBegin = now.add(await duration.minutes(5));
        vestingCliff = now.add(await duration.minutes(15));
        vestingEnd = now.add(await duration.minutes(25));

        await shouldFailWithMessage(
            this.vestingFactory.createVestingContract(
                recipient,
                vestingAmount,
                vestingBegin,
                vestingCliff,
                vestingEnd
            ),
            "insufficient balance for vestingAmount"
        );
        
        expectBignumberEqual(
            (await this.vestingFactory.getVestingContracts(recipient)).length,
            0
        );

        await this.token.transfer(this.vestingFactory.address, vestingAmount);

        await this.vestingFactory.createVestingContract(
            recipient,
            vestingAmount,
            vestingBegin,
            vestingCliff,
            vestingEnd
        );

        expectBignumberEqual(
            (await this.vestingFactory.getVestingContracts(recipient)).length,
            1
        );
    });

    it('reverts after admin withdraws and vesting factory balance is less than vesting amount', async function () {
        vestingBegin = now.add(await duration.minutes(5));
        vestingCliff = now.add(await duration.minutes(15));
        vestingEnd = now.add(await duration.minutes(25));

        await this.token.transfer(this.vestingFactory.address, vestingAmount);

        await this.vestingFactory.withdraw(vestingAmount.sub(1));
        
        await shouldFailWithMessage(
            this.vestingFactory.createVestingContract(
                recipient,
                vestingAmount,
                vestingBegin,
                vestingCliff,
                vestingEnd
            ),
            "insufficient balance for vestingAmount"
        );
        
        expectBignumberEqual(
            (await this.vestingFactory.getVestingContracts(recipient)).length,
            0
        );
    });

    it('reverts from vesting contract if any constructor parameter(s) is rejected', async function () {
        vestingBegin = now.add(await duration.minutes(5));
        vestingCliff = now.add(await duration.minutes(15));
        vestingEnd = now.add(await duration.minutes(25));

        await this.token.transfer(this.vestingFactory.address, vestingAmount);
        
        await shouldFailWithMessage(
            this.vestingFactory.createVestingContract(
                ZERO_ADDRESS,
                vestingAmount,
                vestingBegin,
                vestingCliff,
                vestingEnd
            ),
            "TreasuryVester::constructor: invalid recipient address"
        );

        /* await shouldFailWithMessage(
            this.vestingFactory.createVestingContract(
                recipient,
                vestingAmount,
                vestingBegin.sub(toBN(await duration.minutes(6))),
                vestingCliff,
                vestingEnd
            ),
            "TreasuryVester::constructor: vesting begin too early"
        ); */

        await shouldFailWithMessage(
            this.vestingFactory.createVestingContract(
                recipient,
                vestingAmount,
                vestingBegin,
                vestingCliff.sub(toBN(await duration.minutes(11))),
                vestingEnd
            ),
            "TreasuryVester::constructor: cliff is too early"
        );

        await shouldFailWithMessage(
            this.vestingFactory.createVestingContract(
                recipient,
                vestingAmount,
                vestingBegin,
                vestingCliff,
                vestingEnd.sub(toBN(await duration.minutes(10)))
            ),
            "TreasuryVester::constructor: end is too early"
        );
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
        );
        
        const tx = await this.vestingFactory.createVestingContract(
            recipient,
            vestingAmount,
            vestingBegin,
            vestingCliff,
            vestingEnd
        );
        const {args} = await findEventInTransaction(tx, 'VestingContract');
        expectBignumberEqual(args.index, new_contract_data.index_);
        expect(args.recipient).to.be.equal(new_contract_data.recipient_);
        expect(args.vestingContract).to.be.equal(new_contract_data.vestingContract_);
            
        expect(await this.vestingFactory.vestingContracts(recipient, 0)).to.be.equal(new_contract_data.vestingContract_);
        expect(await this.vestingFactory.vestingContracts(recipient, new_contract_data.index_)).to.be.equal(new_contract_data.vestingContract_);
        expect(await this.vestingFactory.getVestingContract(recipient, new_contract_data.index_)).to.be.equal(new_contract_data.vestingContract_);

        expectBignumberEqual(
            (await this.vestingFactory.getVestingContracts(recipient)).length,
            1
        );
    });

    it('created vesting contract deployed from factory should receive vested tokens', async function () {
        vestingBegin = now.add(await duration.minutes(5));
        vestingCliff = now.add(await duration.minutes(15));
        vestingEnd = now.add(await duration.minutes(25));

        await this.token.transfer(this.vestingFactory.address, vestingAmount);

        await this.vestingFactory.createVestingContract(
            recipient,
            vestingAmount,
            vestingBegin,
            vestingCliff,
            vestingEnd
        );

        // let lastUpdate = vestingBegin;

        const vestingContractAddress = await this.vestingFactory.getVestingContract(recipient, 0);
        // const vestingContractInstance = await Vesting.at(vestingContractAddress);
        // created contract should receive vested tokens
        expectBignumberEqual(await this.token.balanceOf(vestingContractAddress), vestingAmount);
    });

    it('recipient can execute functions on vesting contract deployed from factory', async function () {
        vestingBegin = now.add(await duration.minutes(5));
        vestingCliff = now.add(await duration.minutes(15));
        vestingEnd = now.add(await duration.minutes(25));

        await this.token.transfer(this.vestingFactory.address, vestingAmount);

        await this.vestingFactory.createVestingContract(
            recipient,
            vestingAmount,
            vestingBegin,
            vestingCliff,
            vestingEnd
        );

        // let lastUpdate = vestingBegin;

        const vestingContractAddress = await this.vestingFactory.getVestingContract(recipient, 0);
        const vestingContractInstance = await Vesting.at(vestingContractAddress);

        // recipient can interact with functions in vesting contract
        await vestingContractInstance.setRecipient(accounts[4], {from: recipient});
        expect(await vestingContractInstance.recipient()).to.be.equal(accounts[4]);

        await shouldFailWithMessage(
            vestingContractInstance.setRecipient(accounts[4], {from: recipient}),
            "TreasuryVester::setRecipient: unauthorized"
        );

        await shouldFailWithMessage(
            vestingContractInstance.delegate(accounts[4], {from: recipient}),
            "TreasuryVester::delegate: unauthorized"
        );

        await vestingContractInstance.setRecipient(recipient, {from: accounts[4]}); 

        await vestingContractInstance.delegate(accounts[4], {from: recipient});
    });

    it('recipient can claim from created vesting contract', async function () {
        vestingBegin = now.add(await duration.minutes(5));
        vestingCliff = now.add(await duration.minutes(15));
        vestingEnd = now.add(await duration.minutes(25));

        await this.token.transfer(this.vestingFactory.address, vestingAmount);

        await this.vestingFactory.createVestingContract(
            recipient,
            vestingAmount,
            vestingBegin,
            vestingCliff,
            vestingEnd
        );

        let lastUpdate = vestingBegin;

        const vestingContractAddress = await this.vestingFactory.getVestingContract(recipient, 0);
        const vestingContractInstance = await Vesting.at(vestingContractAddress);
       
        // created contract should have correct variables set
        expect(await vestingContractInstance.recipient()).to.be.equal(recipient);
        expect(await vestingContractInstance.eul()).to.be.equal(this.token.address);
        expectBignumberEqual(await vestingContractInstance.vestingAmount(), vestingAmount);
        expectBignumberEqual(await vestingContractInstance.vestingBegin(), vestingBegin);
        expectBignumberEqual(await vestingContractInstance.vestingCliff(), vestingCliff);
        expectBignumberEqual(await vestingContractInstance.vestingEnd(), vestingEnd);

        expectBignumberEqual(await vestingContractInstance.lastUpdate(), lastUpdate);

        // recipient can claim from created vesting contract
        await shouldFailWithMessage(
            vestingContractInstance.claim(),
            "TreasuryVester::claim: not time yet"
        );

        now = await latest();
        
        expect(now).to.be.bignumber.lessThan(vestingEnd);

        await increaseTo(vestingEnd);
        await increase(1);

        now = await latest();

        // vesting end timestamp has passed at this point
        expect(now).to.be.bignumber.greaterThan(vestingEnd);

        await vestingContractInstance.claim();
        expectBignumberEqual(await this.token.balanceOf(recipient), vestingAmount);
        expectBignumberEqual(await this.token.balanceOf(vestingContractAddress), 0);
    });

    it('created contract should have correct variables set', async function () {
        vestingBegin = now.add(await duration.minutes(5));
        vestingCliff = now.add(await duration.minutes(15));
        vestingEnd = now.add(await duration.minutes(25));

        await this.token.transfer(this.vestingFactory.address, vestingAmount);

        await this.vestingFactory.createVestingContract(
            recipient,
            vestingAmount,
            vestingBegin,
            vestingCliff,
            vestingEnd
        );

        let lastUpdate = vestingBegin;

        const vestingContractAddress = await this.vestingFactory.getVestingContract(recipient, 0);
        const vestingContractInstance = await Vesting.at(vestingContractAddress);
       
        // created contract should have correct variables set
        expect(await vestingContractInstance.recipient()).to.be.equal(recipient);
        expect(await vestingContractInstance.eul()).to.be.equal(this.token.address);
        expectBignumberEqual(await vestingContractInstance.vestingAmount(), vestingAmount);
        expectBignumberEqual(await vestingContractInstance.vestingBegin(), vestingBegin);
        expectBignumberEqual(await vestingContractInstance.vestingCliff(), vestingCliff);
        expectBignumberEqual(await vestingContractInstance.vestingEnd(), vestingEnd);

        expectBignumberEqual(await vestingContractInstance.lastUpdate(), lastUpdate);
    });

})