const { BN, constants } = require('@openzeppelin/test-helpers');
const { expect } = require('chai');
const { shouldFailWithMessage } = require('../../../helpers/utils');
const { ZERO_ADDRESS } = constants;

const ERC20VotesMock = artifacts.require('ERC20VotesMock');
const VestingFactory = artifacts.require('TreasuryVesterFactory');

contract('TreasuryVesterFactory: constructor', function (accounts) {
  const [owner] = accounts;

    const name = 'Euler';
    const symbol = 'EUL';
    const initialSupply = new BN(200);

    describe('deploy correctly and assign field variables', function () {
      beforeEach(async function () {
          this.token = await ERC20VotesMock.new(name, symbol);
          
          this.vestingFactory = await VestingFactory.new(
            this.token.address,
            accounts[0]
          );
        });

        it('has a valid address', async function () {
          expect(await this.vestingFactory.address).to.not.equal(ZERO_ADDRESS);
        });

        it('token address is valid', async function () {
          expect(await this.vestingFactory.euler()).to.not.equal(ZERO_ADDRESS);
        });

        it('treasury address is valid', async function () {
            expect(await this.vestingFactory.treasury()).to.not.equal(ZERO_ADDRESS);
        });

        // role check for owner
        it('should assign deployer with owner role', async function () {
            let role = await this.vestingFactory.ADMIN_ROLE();
            expect(await this.vestingFactory.hasRole(role, owner)).to.equal(true);
        });

      });

      describe('revert if not deployed correctly', function () {
        beforeEach(async function () {
            this.token = await ERC20VotesMock.new(name, symbol);
          });
  
          it('revert if zero address passed as euler token', async function () {
              await shouldFailWithMessage(
                VestingFactory.new(
                    ZERO_ADDRESS,
                    accounts[0]
                ),
                "cannot set zero address as euler token"
              );
          });

          it('revert if zero address passed as treasury', async function () {
            await shouldFailWithMessage(
              VestingFactory.new(
                  this.token.address,
                  ZERO_ADDRESS
              ),
              "cannot set zero address as treasuty"
            );
        });

          it('revert if non contract passed as euler token', async function () {
            await shouldFailWithMessage(
              VestingFactory.new(
                  accounts[0],
                  accounts[1]
              ),
              "euler must be a smart contract"
            );
        });
    });
      

});