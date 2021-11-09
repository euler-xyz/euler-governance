const { BN, constants, expectEvent, expectRevert } = require('@openzeppelin/test-helpers');
const { latest, duration, increase } = require('@openzeppelin/test-helpers/src/time');
const { expect } = require('chai');
const { toBN } = require('../../helpers/utils');
const { expectBignumberEqual } = require('../../helpers/index');
const { ZERO_ADDRESS } = constants;

const {
    shouldBehaveLikeERC20,
    shouldBehaveLikeERC20Transfer,
    shouldBehaveLikeERC20Approve,
} = require('./ERC20.behavior');
const { parseEther, formatEther } = require('@ethersproject/units');

const ERC20Mock = artifacts.require('TestEulerInflatedToken');

contract('ERC20 token with annual inflation: ERC20 behaviour tests', function (accounts) {
    const [initialHolder, recipient, anotherAccount] = accounts;

    const name = 'Euler';
    const symbol = 'EUL';
    const initialSupply = new BN(200);
    let now, mintingRestrictedBefore;
    const mintMaxPercent = toBN(2718);

    beforeEach(async function () {
        now = await latest();
        mintingRestrictedBefore = now.add(duration.minutes(2));
        this.token = await ERC20Mock.new(name, symbol, initialSupply, mintingRestrictedBefore);
    });

    it('has a name', async function () {
        expect(await this.token.name()).to.equal(name);
    });

    it('has a symbol', async function () {
        expect(await this.token.symbol()).to.equal(symbol);
    });

    it('has 18 decimals', async function () {
        expect(await this.token.decimals()).to.be.bignumber.equal('18');
    });

    it('has correct minting max percent', async function () {
        expect(await this.token.MINT_MAX_PERCENT()).to.be.bignumber.equal(mintMaxPercent);
    });

    shouldBehaveLikeERC20('ERC20', initialSupply, initialHolder, recipient, anotherAccount);

})

contract('ERC20 token with annual inflation: annual inflation tests', function (accounts) {
    const [initialHolder, recipient, anotherAccount] = accounts;

    const name = 'Euler';
    const symbol = 'EUL';
    const initialSupply = parseEther('200'); //new BN(200);
    let now, mintingRestrictedBefore;
    const mintMaxPercent = toBN(2718);

    beforeEach(async function () {
        now = await latest();
        mintingRestrictedBefore = now.add(duration.minutes(2));
        this.token = await ERC20Mock.new(name, symbol, initialSupply, mintingRestrictedBefore);
    });

    it('has a name', async function () {
        expect(await this.token.name()).to.equal(name);
    });

    it('has a symbol', async function () {
        expect(await this.token.symbol()).to.equal(symbol);
    });

    it('has 18 decimals', async function () {
        expect(await this.token.decimals()).to.be.bignumber.equal('18');
    });

    it('has correct minting max percent', async function () {
        expect(await this.token.MINT_MAX_PERCENT()).to.be.bignumber.equal(mintMaxPercent);
    });

    //shouldBehaveLikeERC20('ERC20', initialSupply, initialHolder, recipient, anotherAccount);

    describe('update treasury', function () {
        it('reverts if new treasury address is zero address', async function () {
            await expectRevert(this.token.updateTreasury(
                ZERO_ADDRESS, { from: initialHolder }), 'cannot set or mint to zero treasury address',
            );
        });

        it('should set new treasury address', async function () {
            expect(await this.token.treasury()).to.be.equal(ZERO_ADDRESS);
            await this.token.updateTreasury(recipient, { from: initialHolder });
            expect(await this.token.treasury()).to.be.equal(recipient);
        });

        it('should emit correct event and parameters upon setting new treasury address', async function () {
            const { logs } = await this.token.updateTreasury(recipient, { from: initialHolder });

            expectEvent.inLogs(logs, 'TreasuryUpdated', {
                newTreasury: recipient
              });
        });
    });

    describe('mint inflated amount to treasury', function () {
/* 
        beforeEach(async function () {
           // grant minting role
           const mintingRole = await this.token.MINTER_ROLE();
           await this.token.grantRole(mintingRole, initialHolder, { from: initialHolder });

          }); */

        it('should revert if minting time not reached', async function () {
            // grant minting role
           const mintingRole = await this.token.MINTER_ROLE();
           await this.token.grantRole(mintingRole, initialHolder, { from: initialHolder });

           let now = await latest();
            //(console.log(now.toString()))
            //console.log((await this.token._mintingRestrictedBefore()).toString())

            expect(now).to.be.bignumber.lessThan(await this.token._mintingRestrictedBefore())
            
            await expectRevert(
                this.token.mint({ from: initialHolder }),
                "MINT_TOO_EARLY"
            );
        });

        it('should revert if treasury address is 0', async function () {
            // grant minting role
           const mintingRole = await this.token.MINTER_ROLE();
           await this.token.grantRole(mintingRole, initialHolder, { from: initialHolder });

           let now = await latest();
            //(console.log(now.toString()))
            //console.log((await this.token._mintingRestrictedBefore()).toString())

            expect(now).to.be.bignumber.lessThan(await this.token._mintingRestrictedBefore())
            
            await increase(await this.token._mintingRestrictedBefore());
            await increase(1);

            await expectRevert(
                this.token.mint({ from: initialHolder }),
                "INVALID_TREASURY_ADDRESS"
            );
        });

        it('should mint correct amount successfully to treasury and increase treasury balance', async function () {
            // grant minting role
           const mintingRole = await this.token.MINTER_ROLE();
           await this.token.grantRole(mintingRole, initialHolder, { from: initialHolder });

           let now = await latest();
            //(console.log(now.toString()))
            //console.log((await this.token._mintingRestrictedBefore()).toString())

            expect(now).to.be.bignumber.lessThan(await this.token._mintingRestrictedBefore())
            
            await increase(await this.token._mintingRestrictedBefore());
            await increase(1);

            await this.token.updateTreasury(recipient, {from: initialHolder});

            const treasury = await this.token.treasury();

            expectBignumberEqual(await this.token.balanceOf(treasury), 0);

            let totalSupply = await this.token.totalSupply();
            let amountToMint = (totalSupply.mul(mintMaxPercent)).div(toBN(100000));
            
            await this.token.mint({ from: initialHolder });

            expect(await this.token.MINT_MAX_PERCENT()).to.be.bignumber.equal(mintMaxPercent);

            expectBignumberEqual(await this.token.balanceOf(treasury), amountToMint);

            console.log("amount to mint", amountToMint.toString(), (await this.token.balanceOf(treasury)).toString(), formatEther(initialSupply) * 0.02718)
             
        });

        it('should increase total supply and update next time minting will be allowed after minting', async function () {
            // grant minting role
           const mintingRole = await this.token.MINTER_ROLE();
           await this.token.grantRole(mintingRole, initialHolder, { from: initialHolder });

           let now = await latest();
            //(console.log(now.toString()))
            //console.log((await this.token._mintingRestrictedBefore()).toString())

            expect(now).to.be.bignumber.lessThan(await this.token._mintingRestrictedBefore())
            
            await increase(await this.token._mintingRestrictedBefore());
            await increase(1);

            await this.token.updateTreasury(recipient, {from: initialHolder});

            const treasury = await this.token.treasury();

            expectBignumberEqual(await this.token.balanceOf(treasury), 0);

            let totalSupply = await this.token.totalSupply();
            let amountToMint = (totalSupply.mul(mintMaxPercent)).div(toBN(100000));

            await this.token.mint({ from: initialHolder });

            let nextTimeMintingAllowed = (await latest()).add(await duration.days(365));

            expectBignumberEqual(await this.token._mintingRestrictedBefore(), nextTimeMintingAllowed);

            expect(await this.token.MINT_MAX_PERCENT()).to.be.bignumber.equal(mintMaxPercent);

            expectBignumberEqual(await this.token.balanceOf(treasury), amountToMint);
             
            expectBignumberEqual(await this.token.totalSupply(), totalSupply.add(amountToMint));
        });

        it('should mint after updating next time minting will be allowed after initial minting', async function () {
            // grant minting role
           const mintingRole = await this.token.MINTER_ROLE();
           await this.token.grantRole(mintingRole, initialHolder, { from: initialHolder });

           let now = await latest();
            //(console.log(now.toString()))
            //console.log((await this.token._mintingRestrictedBefore()).toString())

            expect(now).to.be.bignumber.lessThan(await this.token._mintingRestrictedBefore())
            
            await increase(await this.token._mintingRestrictedBefore());
            await increase(1);

            await this.token.updateTreasury(recipient, {from: initialHolder});

            const treasury = await this.token.treasury();

            expectBignumberEqual(await this.token.balanceOf(treasury), 0);

            let totalSupply = await this.token.totalSupply();
            let amountToMint = (totalSupply.mul(mintMaxPercent)).div(toBN(100000));

            await this.token.mint({ from: initialHolder });

            let nextTimeMintingAllowed = (await latest()).add(await duration.days(365));

            expectBignumberEqual(await this.token._mintingRestrictedBefore(), nextTimeMintingAllowed);

            expect(await this.token.MINT_MAX_PERCENT()).to.be.bignumber.equal(mintMaxPercent);

            expectBignumberEqual(await this.token.balanceOf(treasury), amountToMint);
             
            await increase(await this.token._mintingRestrictedBefore());
            await increase(1);

            totalSupply = await this.token.totalSupply();
            amountToMint = (totalSupply.mul(mintMaxPercent)).div(toBN(100000));

            const { logs } = await this.token.mint({ from: initialHolder });

            expectEvent.inLogs(logs, 'Transfer', {
                from: ZERO_ADDRESS,
                to: recipient,
                value: amountToMint,
              });
        });

        it('should revert if caller does not have minting permissions', async function () {
            await expectRevert(
                this.token.mint({ from: initialHolder }),
                "Caller does not have the MINTER_ROLE"
            );
        });
    });

});
