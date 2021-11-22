const { constants } = require('@openzeppelin/test-helpers');
const { expect } = require('chai');
const { shouldFailWithMessage } = require('../../../helpers/utils');
const { ZERO_ADDRESS } = constants;
const { findEventInTransaction } = require('../../../helpers/events');

const ERC20VotesMock = artifacts.require('ERC20VotesMock');
const VestingFactory = artifacts.require('TreasuryVesterFactory');

contract('TreasuryVesterFactory: updateTreasury()', function (accounts) {
  const [owner] = accounts;

    const name = 'Euler';
    const symbol = 'EUL';

    describe('deploy correctly and assign field variables', function () {
      beforeEach(async function () {
          this.token = await ERC20VotesMock.new(name, symbol);
          
          this.vestingFactory = await VestingFactory.new(
            this.token.address,
            accounts[0]
          );
        });

        it('revert if treasury address is zero address', async function () {
            await shouldFailWithMessage(
                this.vestingFactory.updateTreasury(
                    ZERO_ADDRESS
                ),
                'revert'
            );
        });

        // role check for owner
        it('revert if non owner tries to set treasury', async function () {
            await shouldFailWithMessage(
                this.vestingFactory.updateTreasury(
                    accounts[1],
                    {from: accounts[1]}
                ),
                'revert'
              );
        });

        // role check for owner
        it('allow owner to set treasury', async function () {
            expect(await this.vestingFactory.treasury()).to.equal(accounts[0]);

            await this.vestingFactory.updateTreasury(accounts[1], {from: accounts[0]});

            expect(await this.vestingFactory.treasury()).to.equal(accounts[1]);
        });

        it('emit correct event and parameters', async function () {
            expect(await this.vestingFactory.treasury()).to.equal(accounts[0]);

            const tx = await this.vestingFactory.updateTreasury(accounts[1], {from: accounts[0]});

            expect(await this.vestingFactory.treasury()).to.equal(accounts[1]);

            const { args } = await findEventInTransaction(tx, 'TreasuryUpdated');
            expect(args.newTreasury).to.equal(accounts[1]);
        });

      });
});