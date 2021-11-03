const { BN, constants, expectEvent, expectRevert, time } = require('@openzeppelin/test-helpers');
const { expect } = require('chai');
const { MAX_UINT256, ZERO_ADDRESS, ZERO_BYTES32 } = constants;

const ERC20VotesMock = artifacts.require('ERC20VotesMock');


contract('TreasuryVester: constructor', function (accounts) {
  const [initialHolder, recipient, anotherAccount] = accounts;

    const name = 'Euler';
    const symbol = 'EUL';
    const initialSupply = new BN(200);
    let now, mintingRestrictedBefore;
    const mintMaxPercent = toBN(2718);

    beforeEach(async function () {
        now = await latest();
        mintingRestrictedBefore = now.add(duration.minutes(2));
        this.token = await ERC20VotesMock.new(name, symbol, initialSupply, mintingRestrictedBefore);
    });

    
});