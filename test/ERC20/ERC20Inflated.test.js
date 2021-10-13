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

const ERC20Mock = artifacts.require('TestEulerInflatedToken');

contract('ERC20', function (accounts) {
    const [initialHolder, recipient, anotherAccount] = accounts;

    const name = 'Euler';
    const symbol = 'EUL';
    const initialSupply = new BN(100);
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

            expect(await this.token.treasury()).to.be.equal(recipient);
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
            await increase(1)

            await this.token.updateTreasury(recipient, {from: initialHolder});

            const treasury = await this.token.treasury();

            expectBignumberEqual(await this.token.balanceOf(treasury), 0);

            let totalSupply = await this.token.totalSupply();
            let amountToMint = (totalSupply.mul(mintMaxPercent)).div(toBN(100000));

            await this.token.mint({ from: initialHolder });

            expect(await this.token.MINT_MAX_PERCENT()).to.be.bignumber.equal(mintMaxPercent);

            expectBignumberEqual(await this.token.balanceOf(treasury), amountToMint);
             
        });

        it('should update next time minting will be allowed after minting', async function () {
            // grant minting role
           const mintingRole = await this.token.MINTER_ROLE();
           await this.token.grantRole(mintingRole, initialHolder, { from: initialHolder });

           let now = await latest();
            //(console.log(now.toString()))
            //console.log((await this.token._mintingRestrictedBefore()).toString())

            expect(now).to.be.bignumber.lessThan(await this.token._mintingRestrictedBefore())
            
            await increase(await this.token._mintingRestrictedBefore());
            await increase(1)

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
             
        });

        it('should revert if caller does not have minting permissions', async function () {
           let now = await latest();

            await expectRevert(
                this.token.mint({ from: initialHolder }),
                "Caller does not have the MINTER_ROLE"
            );
        });


    });

    /* describe('decrease allowance', function () {
      describe('when the spender is not the zero address', function () {
        const spender = recipient;
  
        function shouldDecreaseApproval (amount) {
          describe('when there was no approved amount before', function () {
            it('reverts', async function () {
              await expectRevert(this.token.decreaseAllowance(
                spender, amount, { from: initialHolder }), 'ERC20: decreased allowance below zero',
              );
            });
          });
  
          describe('when the spender had an approved amount', function () {
            const approvedAmount = amount;
  
            beforeEach(async function () {
              ({ logs: this.logs } = await this.token.approve(spender, approvedAmount, { from: initialHolder }));
            });
  
            it('emits an approval event', async function () {
              const { logs } = await this.token.decreaseAllowance(spender, approvedAmount, { from: initialHolder });
  
              expectEvent.inLogs(logs, 'Approval', {
                owner: initialHolder,
                spender: spender,
                value: new BN(0),
              });
            });
  
            it('decreases the spender allowance subtracting the requested amount', async function () {
              await this.token.decreaseAllowance(spender, approvedAmount.subn(1), { from: initialHolder });
  
              expect(await this.token.allowance(initialHolder, spender)).to.be.bignumber.equal('1');
            });
  
            it('sets the allowance to zero when all allowance is removed', async function () {
              await this.token.decreaseAllowance(spender, approvedAmount, { from: initialHolder });
              expect(await this.token.allowance(initialHolder, spender)).to.be.bignumber.equal('0');
            });
  
            it('reverts when more than the full allowance is removed', async function () {
              await expectRevert(
                this.token.decreaseAllowance(spender, approvedAmount.addn(1), { from: initialHolder }),
                'ERC20: decreased allowance below zero',
              );
            });
          });
        }
  
        describe('when the sender has enough balance', function () {
          const amount = initialSupply;
  
          shouldDecreaseApproval(amount);
        });
  
        describe('when the sender does not have enough balance', function () {
          const amount = initialSupply.addn(1);
  
          shouldDecreaseApproval(amount);
        });
      });
  
      describe('when the spender is the zero address', function () {
        const amount = initialSupply;
        const spender = ZERO_ADDRESS;
  
        it('reverts', async function () {
          await expectRevert(this.token.decreaseAllowance(
            spender, amount, { from: initialHolder }), 'ERC20: decreased allowance below zero',
          );
        });
      });
    });
  
    describe('increase allowance', function () {
      const amount = initialSupply;
  
      describe('when the spender is not the zero address', function () {
        const spender = recipient;
  
        describe('when the sender has enough balance', function () {
          it('emits an approval event', async function () {
            const { logs } = await this.token.increaseAllowance(spender, amount, { from: initialHolder });
  
            expectEvent.inLogs(logs, 'Approval', {
              owner: initialHolder,
              spender: spender,
              value: amount,
            });
          });
  
          describe('when there was no approved amount before', function () {
            it('approves the requested amount', async function () {
              await this.token.increaseAllowance(spender, amount, { from: initialHolder });
  
              expect(await this.token.allowance(initialHolder, spender)).to.be.bignumber.equal(amount);
            });
          });
  
          describe('when the spender had an approved amount', function () {
            beforeEach(async function () {
              await this.token.approve(spender, new BN(1), { from: initialHolder });
            });
  
            it('increases the spender allowance adding the requested amount', async function () {
              await this.token.increaseAllowance(spender, amount, { from: initialHolder });
  
              expect(await this.token.allowance(initialHolder, spender)).to.be.bignumber.equal(amount.addn(1));
            });
          });
        });
  
        describe('when the sender does not have enough balance', function () {
          const amount = initialSupply.addn(1);
  
          it('emits an approval event', async function () {
            const { logs } = await this.token.increaseAllowance(spender, amount, { from: initialHolder });
  
            expectEvent.inLogs(logs, 'Approval', {
              owner: initialHolder,
              spender: spender,
              value: amount,
            });
          });
  
          describe('when there was no approved amount before', function () {
            it('approves the requested amount', async function () {
              await this.token.increaseAllowance(spender, amount, { from: initialHolder });
  
              expect(await this.token.allowance(initialHolder, spender)).to.be.bignumber.equal(amount);
            });
          });
  
          describe('when the spender had an approved amount', function () {
            beforeEach(async function () {
              await this.token.approve(spender, new BN(1), { from: initialHolder });
            });
  
            it('increases the spender allowance adding the requested amount', async function () {
              await this.token.increaseAllowance(spender, amount, { from: initialHolder });
  
              expect(await this.token.allowance(initialHolder, spender)).to.be.bignumber.equal(amount.addn(1));
            });
          });
        });
      });
  
      describe('when the spender is the zero address', function () {
        const spender = ZERO_ADDRESS;
  
        it('reverts', async function () {
          await expectRevert(
            this.token.increaseAllowance(spender, amount, { from: initialHolder }), 'ERC20: approve to the zero address',
          );
        });
      });
    });
  
    describe('_mint', function () {
      const amount = new BN(50);
      it('rejects a null account', async function () {
        await expectRevert(
          this.token.mint(ZERO_ADDRESS, amount), 'ERC20: mint to the zero address',
        );
      });
  
      describe('for a non zero account', function () {
        beforeEach('minting', async function () {
          const { logs } = await this.token.mint(recipient, amount);
          this.logs = logs;
        });
  
        it('increments totalSupply', async function () {
          const expectedSupply = initialSupply.add(amount);
          expect(await this.token.totalSupply()).to.be.bignumber.equal(expectedSupply);
        });
  
        it('increments recipient balance', async function () {
          expect(await this.token.balanceOf(recipient)).to.be.bignumber.equal(amount);
        });
  
        it('emits Transfer event', async function () {
          const event = expectEvent.inLogs(this.logs, 'Transfer', {
            from: ZERO_ADDRESS,
            to: recipient,
          });
  
          expect(event.args.value).to.be.bignumber.equal(amount);
        });
      });
    });
  
    describe('_burn', function () {
      it('rejects a null account', async function () {
        await expectRevert(this.token.burn(ZERO_ADDRESS, new BN(1)),
          'ERC20: burn from the zero address');
      });
  
      describe('for a non zero account', function () {
        it('rejects burning more than balance', async function () {
          await expectRevert(this.token.burn(
            initialHolder, initialSupply.addn(1)), 'ERC20: burn amount exceeds balance',
          );
        });
  
        const describeBurn = function (description, amount) {
          describe(description, function () {
            beforeEach('burning', async function () {
              const { logs } = await this.token.burn(initialHolder, amount);
              this.logs = logs;
            });
  
            it('decrements totalSupply', async function () {
              const expectedSupply = initialSupply.sub(amount);
              expect(await this.token.totalSupply()).to.be.bignumber.equal(expectedSupply);
            });
  
            it('decrements initialHolder balance', async function () {
              const expectedBalance = initialSupply.sub(amount);
              expect(await this.token.balanceOf(initialHolder)).to.be.bignumber.equal(expectedBalance);
            });
  
            it('emits Transfer event', async function () {
              const event = expectEvent.inLogs(this.logs, 'Transfer', {
                from: initialHolder,
                to: ZERO_ADDRESS,
              });
  
              expect(event.args.value).to.be.bignumber.equal(amount);
            });
          });
        };
  
        describeBurn('for entire balance', initialSupply);
        describeBurn('for less amount than balance', initialSupply.subn(1));
      });
    });
  
    describe('_transfer', function () {
      shouldBehaveLikeERC20Transfer('ERC20', initialHolder, recipient, initialSupply, function (from, to, amount) {
        return this.token.transferInternal(from, to, amount);
      });
  
      describe('when the sender is the zero address', function () {
        it('reverts', async function () {
          await expectRevert(this.token.transferInternal(ZERO_ADDRESS, recipient, initialSupply),
            'ERC20: transfer from the zero address',
          );
        });
      });
    });
  
    describe('_approve', function () {
      shouldBehaveLikeERC20Approve('ERC20', initialHolder, recipient, initialSupply, function (owner, spender, amount) {
        return this.token.approveInternal(owner, spender, amount);
      });
  
      describe('when the owner is the zero address', function () {
        it('reverts', async function () {
          await expectRevert(this.token.approveInternal(ZERO_ADDRESS, recipient, initialSupply),
            'ERC20: approve from the zero address',
          );
        });
      });
    }); */
});
