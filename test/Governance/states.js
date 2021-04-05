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
const { web3 } = require('@openzeppelin/test-helpers/src/setup');

describe('Governance: proposal states', () => {
  let eul; let gov; let root; let acct; let delay; let timelockInstance;
  let trivialProposal; let targets; let values; let signatures; let
    callDatas;

  before(async () => {
    await freezeTime(100);
    [root, acct, ...accounts] = await web3.eth.getAccounts();
    
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
    await eulerTokenInstance.transfer(acct, parseEther('4000000'));
    await eulerTokenInstance.delegate(acct, {from: acct});

    targets = [root];
    values = ['0'];
    signatures = ['getBalanceOf(address)'];
    callDatas = [ethers.utils.defaultAbiCoder.encode(['address'], [acct])];
    await eulerTokenInstance.delegate(root);
    await gov.propose(targets, values, signatures, callDatas, 'do nothing');
    proposalId = await gov.latestProposalIds(root);
    trivialProposal = await gov.proposals(proposalId);
  });

  async function enfranchise(eulerTokenInstance, actor, amount) {
    await eulerTokenInstance.transfer(actor, amount);
    await eulerTokenInstance.delegate(actor, {from: actor});
  }

  describe('Proposal States', () => {
    it('Invalid for proposal not found', async () => {
      await shouldFailWithMessage(gov.state('5'), 'Governance::state: invalid proposal id');
    });

    it('Pending', async () => {
      expectBignumberEqual(await gov.state(trivialProposal.id), PROPOSAL_STATES.Pending);
    });

    it('Active', async () => {
      await mineBlock();
      await mineBlock();
      expectBignumberEqual(await gov.state(trivialProposal.id), PROPOSAL_STATES.Active);
    });

    it('Canceled', async () => {
      await eulerTokenInstance.transfer(accounts[0], parseEther('4000000'));
      await eulerTokenInstance.delegate(accounts[0], {from: accounts[0]});
      await mineBlock();
      await gov.propose(targets, values, signatures, callDatas,
        'do nothing', {from: accounts[0]});
      const newProposalId = await gov.proposalCount();
      // send away the delegates
      await eulerTokenInstance.delegate(root, {from: accounts[0]});
      await gov.cancel(newProposalId);
      expectBignumberEqual(await gov.state(+newProposalId), PROPOSAL_STATES.Canceled);
    });
    
    it("Defeated", async () => {
        const now = await latest();
        const actor = accounts[2];
        const actor2 = accounts[3];
        await enfranchise(eulerTokenInstance, actor, parseEther('400001'));
        await enfranchise(eulerTokenInstance, actor2, parseEther('400001'));
        
        await gov.castVote(trivialProposal.id, false, {from: actor});
        await gov.castVote(trivialProposal.id, false, {from: actor2});
        // travel to end block
        //await advanceBlockTo(20000);
        //console.log(await gov.proposals(trivialProposal.id))
        //await increaseTime(toBN(now).add(duration.minutes(60)));
        console.log('current block', await web3.eth.getBlockNumber())
        console.log('proposal end block', (trivialProposal.endBlock).toString());
        //await advanceBlockTo(toBN(trivialProposal.endBlock));

        for (let i = 0; i<25; i++){
          await mineBlock();
        }

        expectBignumberEqual(await gov.state(trivialProposal.id), PROPOSAL_STATES["Defeated"]);
      })
  /* 
      it("Succeeded", async () => {
        await mineBlock()
        const newProposalId = await gov.propose(targets, values,
          signatures, callDatas, "do nothing", { from: acct })
        await mineBlock()
        await gov.castVote(newProposalId, true)
        await advanceBlocks(20000)
        expectBignumberEqual(await gov.state(newProposalId), PROPOSAL_STATES["Succeeded"])
      })

      it("Queued", async () => {
        await mineBlock()
        const newProposalId  = await gov.propose(targets,
          values, signatures, callDatas, "do nothing", { from: acct })
        await mineBlock()
        await gov.castVote(newProposalId, true)
        await advanceBlocks(20000)
        await gov.queue(newProposalId, { from: acct })
        expectBignumberEqual(await gov.state(newProposalId), PROPOSAL_STATES["Queued"])
      })
      it("Expired", async () => {
        await mineBlock()
        const newProposalId = await gov.propose(targets, values,
          signatures, callDatas, "do nothing", { from: acct })
        await mineBlock()
        await gov.castVote(newProposalId, true)
        await advanceBlocks(20000)
        await increaseTime(1)
        await gov.queue(newProposalId, { from: acct })
        let gracePeriod = await call(timelock, 'GRACE_PERIOD')
        let p = await gov.proposals(newProposalId);
        let eta = etherUnsigned(p.eta)
        await freezeTime(eta.plus(gracePeriod).minus(1).toNumber())
        expectBignumberEqual(await gov.state(newProposalId), PROPOSAL_STATES["Queued"])
        await freezeTime(eta.plus(gracePeriod).toNumber())
        expectBignumberEqual(await gov.state(newProposalId), PROPOSAL_STATES["Expired"])
      })
      it("Executed", async () => {
        await mineBlock()
        const newProposalId = await gov.propose(targets, values,
          signatures, callDatas, "do nothing", { from: acct })
        await mineBlock()
        await gov.castVote(newProposalId, true)
        await advanceBlocks(20000)
        await increaseTime(1)
        await gov.queue(newProposalId, { from: acct })
        let gracePeriod = await call(timelock, 'GRACE_PERIOD')
        let p = await gov.proposals(newProposalId);
        let eta = etherUnsigned(p.eta)
        await freezeTime(eta.plus(gracePeriod).minus(1).toNumber())
        expectBignumberEqual(await gov.state(newProposalId), PROPOSAL_STATES["Queued"])
        await gov.execute(newProposalId, { from: acct })
        expectBignumberEqual(await gov.state(newProposalId), PROPOSAL_STATES["Executed"])
        // still executed even though would be expired
        await freezeTime(eta.plus(gracePeriod).toNumber())
        expectBignumberEqual(await gov.state(newProposalId), PROPOSAL_STATES["Executed"])
      }) */
  });
});
