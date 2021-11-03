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

contract('TreasuryVester: governance', function (accounts) {
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

    describe('create proposal', function () {
        /* it('allow delegatee create a proposal if the amount of tokens vested meets proposal threshold', async function () {
            
        });

        it('revert if the amount of tokens vested is below the proposal threshold', async function () {
            
        }); */
    });

    describe('cast vote', function () {
        /* it('allow delegatee cast a vote on a proposal if amount vested is greater than zero', async function () {
            
        });

        it('should attach/set correct voting power on the proposal after delegatee casts vote', async function () {
            
        });

        it('revert if amount vested is not greater than zero', async function () {
            
        }); */
    });


});