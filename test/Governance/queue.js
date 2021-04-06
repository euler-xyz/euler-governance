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
      // delay = etherUnsigned(2 * 24 * 60 * 60).multipliedBy(2); // 2 days
      delay = duration.minutes(2);

      // Deploy Timelock contract
      const [timelock] = await deployTimeLockHarness({delay});
      
      // Deploy Governance contract with timelock harness
      [
        gov,
        {
          owner,
          timelockInstance,
          eulerTokenInstance
        }
      ] = await deployGovernance({timelock});

      await timelock.harnessSetAdmin(gov.address);
      await enfranchise(eulerTokenInstance, a1, parseEther('400001'));

      await mineBlock();

      const targets = [eulerTokenInstance.address, eulerTokenInstance.address];
      const values = ['0', '0'];
      const signatures = ['getBalanceOf(address)', 'getBalanceOf(address)'];
      const callDatas = [ethers.utils.defaultAbiCoder.encode(['address'], [a1]), ethers.utils.defaultAbiCoder.encode(['address'], [a1])];
      await eulerTokenInstance.delegate(root);
      await gov.propose(targets, values, signatures, callDatas, 'do nothing', {from: a1});
      const proposalId1 = await gov.latestProposalIds(a1);
      
      await mineBlock();

      const txVote1 = await gov.castVote(proposalId1, true, {from: a1});

      //await advanceBlocks(20000)
      for (let i = 0; i<25; i++){
        await mineBlock();
      }

      await shouldFailWithMessage(
        gov.queue(proposalId1, {from: a1}),
        "revert Governance::_queueOrRevert: proposal action already queued at eta"
      );

    });

    it('reverts on queueing overlapping actions in different proposals, works if waiting', async () => {
    });
  });
});