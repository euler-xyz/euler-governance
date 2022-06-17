const { shouldFailWithMessage } = require('../../../helpers/utils');
const { expectBignumberEqual } = require('../../../helpers/index');
const { parseEther } = require('@ethersproject/units');

const ERC20VotesMock = artifacts.require('ERC20VotesMock');
const VestingFactory = artifacts.require('TreasuryVesterFactory'); // artifacts.require('TreasuryVesterFactory');

contract('TreasuryVesterFactory: withdraw()', function (accounts) {
    const [owner] = accounts;

    const amountToMint = parseEther("100");
    const name = 'Euler';
    const symbol = 'EUL';

    beforeEach(async function () {
        this.token = await ERC20VotesMock.new(name, symbol);
        
        this.vestingFactory = await VestingFactory.new(
            this.token.address,
            accounts[1]
        );

        // mint to owner
        await this.token.mint(accounts[0], amountToMint);
    });

    // role check for admin
    it('revert if non admin', async function () {
        const amount = parseEther("50");
        await this.token.transfer(this.vestingFactory.address, amount);

        await shouldFailWithMessage(
            this.vestingFactory.withdraw(
                amount.div(2),
                {from: accounts[2]}
            ),
            'Caller does not have the ADMIN_ROLE'
            );
    });

    it('revert if balance of factory contract is less than amount to withdraw', async function () {
        const amount = parseEther("50");
        await this.token.transfer(this.vestingFactory.address, amount);

        await shouldFailWithMessage(
            this.vestingFactory.withdraw(
                amount.mul(2)
            ),
            'ERC20: transfer amount exceeds balance'
        );
    });

    it('deployer can withdraw and funds only go to treasury', async function () {
        const amount = parseEther("50");
        const treasury = accounts[1];
        await this.token.transfer(this.vestingFactory.address, amount);

        expectBignumberEqual(await this.token.balanceOf(accounts[0]), amountToMint.sub(amount));
        expectBignumberEqual(await this.token.balanceOf(treasury), 0);

        await this.vestingFactory.withdraw(amount);
            
        expectBignumberEqual(await this.token.balanceOf(accounts[0]), amountToMint.sub(amount));
        expectBignumberEqual(await this.token.balanceOf(treasury), amount);
    });


    it('withdrawing 0 amount is a no-op', async function () {
        const amount = parseEther("50");
        const treasury = accounts[1];

        expectBignumberEqual(await this.token.balanceOf(accounts[0]), amountToMint);
        expectBignumberEqual(await this.token.balanceOf(treasury), 0);

        await this.vestingFactory.withdraw(0);
            
        expectBignumberEqual(await this.token.balanceOf(accounts[0]), amountToMint);
        expectBignumberEqual(await this.token.balanceOf(treasury), 0);

        await this.token.transfer(this.vestingFactory.address, amount);

        expectBignumberEqual(await this.token.balanceOf(accounts[0]), amountToMint.sub(amount));
        expectBignumberEqual(await this.token.balanceOf(treasury), 0);

        await this.vestingFactory.withdraw(0);
            
        expectBignumberEqual(await this.token.balanceOf(accounts[0]), amountToMint.sub(amount));
        expectBignumberEqual(await this.token.balanceOf(treasury), 0);
    });

    it('treasury can withdraw and funds only go to treasury', async function () {
        const amount = parseEther("50");
        const treasury = accounts[1];
        await this.token.transfer(this.vestingFactory.address, amount);

        expectBignumberEqual(await this.token.balanceOf(accounts[0]), amountToMint.sub(amount));
        expectBignumberEqual(await this.token.balanceOf(treasury), 0);

        await this.vestingFactory.withdraw(amount, {from: treasury});
            
        expectBignumberEqual(await this.token.balanceOf(accounts[0]), amountToMint.sub(amount));
        expectBignumberEqual(await this.token.balanceOf(treasury), amount);
    });
});