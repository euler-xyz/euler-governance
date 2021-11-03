const { BN, constants, expectEvent, expectRevert, time } = require('@openzeppelin/test-helpers');
const { duration } = require('@openzeppelin/test-helpers/src/time');
const { expect } = require('chai');
const { expectBignumberEqual } = require('../../helpers');
const { toBN, latest } = require('../../helpers/utils');
const { MAX_UINT256, ZERO_ADDRESS, ZERO_BYTES32 } = constants;

const ERC20VotesMock = artifacts.require('ERC20VotesMock');
const Vesting = artifacts.require('TreasuryVester');

contract('TreasuryVester: constructor', function (accounts) {
  const [owner, recipient] = accounts;

    const name = 'Euler';
    const symbol = 'EUL';
    const initialSupply = new BN(200);
    const vestingAmount = new BN(15);
    let now, vestingBegin, vestingCliff, vestingEnd;

    describe('deploy correctly and assign field variables', function () {
      beforeEach(async function () {
          this.token = await ERC20VotesMock.new(name, symbol);
          await this.token.mint(owner, initialSupply)
          now = await latest();
          vestingBegin = now.add(await duration.minutes(5));
          vestingCliff = now.add(await duration.minutes(15));
          vestingEnd = now.add(await duration.minutes(25))
          this.vesting = await Vesting.new(
            this.token.address, 
            recipient, 
            vestingAmount,
            vestingBegin,
            vestingCliff,
            vestingEnd
          );
        });

        it('has a valid address', async function () {
          expect(await this.vesting.address).to.not.equal(ZERO_ADDRESS);
        });

        it('token address is valid', async function () {
          expect(await this.vesting.eul()).to.not.equal(ZERO_ADDRESS);
        });

        it('recipient address is valid', async function () {
          expect(await this.vesting.recipient()).to.not.equal(ZERO_ADDRESS);
          expect(await this.vesting.recipient()).to.equal(recipient);
        });

        it('sets last update time correctly', async function () {
          expectBignumberEqual(await this.vesting.lastUpdate(), vestingBegin);
        })

        it('sets vesting amount correctly', async function () {
          expectBignumberEqual(await this.vesting.vestingAmount(), vestingAmount);
        })

        it('sets vesting begin timestamp correctly', async function () {
          expectBignumberEqual(await this.vesting.vestingBegin(), vestingBegin);
        })

        it('sets vesting cliff timestamp correctly', async function () {
          expectBignumberEqual(await this.vesting.vestingCliff(), vestingCliff);
        })

        it('sets vesting end timestamp correctly', async function () {
          expectBignumberEqual(await this.vesting.vestingEnd(), vestingEnd);
        })


      });

});