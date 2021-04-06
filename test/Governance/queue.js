const { expect } = require('chai');
const { ZERO_ADDRESS, getActorsAsync } = require('../../helpers/address');

const {
  deployGovernance, 
  deployTimeLockHarness
} = require('../helpers/deploy');

const { expectBignumberEqual } = require('../../helpers/index');

const {
  shouldFailWithMessage, 
  parseEther, 
  toBN, 
  advanceBlockTo, 
  latest,
  duration,
  increaseTo
} = require('../../helpers/utils');

const {
  findEventInTransaction
} = require('../../helpers/events')

const {PROPOSAL_STATES} = require('../../helpers/constants');

const {
  etherUnsigned,
  mineBlock,
  freezeTime,
  increaseTime,
  mineBlockNumber
} = require('../helpers/Ethereum');

describe('Governance: proposal queue', () => {
  let root, a1, a2, accounts;
  before(async () => {
    [root, a1, a2, ...accounts] = await web3.eth.getAccounts();
  });

  async function enfranchise(eulerTokenInstance, actor, amount) {
    await eulerTokenInstance.transfer(actor, amount);
    await eulerTokenInstance.delegate(actor, {from: actor});
  }

  describe('Overlapping actions', () => {
    it('reverts on queueing overlapping actions in same proposal', async () => {
    });

    it('reverts on queueing overlapping actions in different proposals, works if waiting', async () => {
    });
  });
});