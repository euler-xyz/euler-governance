const {artifacts} = require('hardhat');
const {
  etherUnsigned,
  mineBlock,
  freezeTime
} = require('../Utils/Ethereum');
const {expectBignumberEqual} = require('../../helpers/index');
const {
  // expectVMException,
  // expectInvalidOpCode,
  shouldFailWithMessage,
  // toHex,
  // hexToBytes,
  // hexToUtf8,
  // bytesToHex,
  // padLeft,
  // padRight,
  // soliditySha3,
  // encodeFunctionSignature,
  // encodeBytes32Param,
  // stringToBytes32,
  // bytes32ToString,
  parseEther
  // formatEther,
  // upgradeProxy,
  // deployProxy,
  // advanceBlockTo,
  // advanceBlock,
  // increaseTime,
  // toBN
} = require('../Utils/utils');

const Eul = artifacts.require('Eul');
const Gov = artifacts.require('Governance');
const TimelockHarness = artifacts.require('TimelockHarness');

const states = {
  Pending: 0,
  Active: 1,
  Canceled: 2,
  Defeated: 3,
  Succeeded: 4,
  Queued: 5,
  Expired: 6,
  Executed: 7
};
describe('Governance#state/1', () => {
  let eul; let gov; let root; let acct; let delay; let timelock;
  let signers;
  before(async () => {
    await freezeTime(100);
    signers = await ethers.getSigners();
    [root, acct, ...accounts] = signers;
    eul = await Eul.new(root.address, {from: root.address});
    delay = etherUnsigned(2 * 24 * 60 * 60).multipliedBy(2);
    // Deploy Timelock contract
    timelock = await TimelockHarness.new(root.address, delay, {from: root.address});
    // Deploy Governance contract
    gov = await Gov.new(timelock.address, eul.address, eul.address, {from: root.address});
    await timelock.harnessSetAdmin(gov.address);
    await eul.transfer(acct.address, parseEther('4000000'));
    await eul.delegate(acct.address, {from: acct.address});
  });
  let trivialProposal; let targets; let values; let signatures; let
    callDatas;
  before(async () => {
    targets = [root.address];
    values = ['0'];
    signatures = ['getBalanceOf(address)'];
    callDatas = [ethers.utils.defaultAbiCoder.encode(['address'], [acct.address])];
    await eul.delegate(root.address);
    await gov.propose(targets, values, signatures, callDatas, 'do nothing');
    proposalId = await gov.latestProposalIds(root.address);
    trivialProposal = await gov.proposals(proposalId);
  });
  it('Invalid for proposal not found', async () => {
    await shouldFailWithMessage(gov.state('5'), 'Governance::state: invalid proposal id');
  });
  it('Pending', async () => {
    expectBignumberEqual(await gov.state(trivialProposal.id), states.Pending);
  });
  it('Active', async () => {
    await mineBlock();
    await mineBlock();
    expectBignumberEqual(await gov.state(trivialProposal.id), states.Active);
  });
  it('Canceled', async () => {
    await eul.transfer(accounts[0].address, parseEther('4000000'));
    await eul.delegate(accounts[0].address, {from: accounts[0].address});
    await mineBlock();
    await gov.propose(targets, values, signatures, callDatas,
      'do nothing', {from: accounts[0].address});
    const newProposalId = await gov.proposalCount();
    // send away the delegates
    await eul.delegate(root.address, {from: accounts[0].address});
    await gov.cancel(newProposalId);
    expectBignumberEqual(await gov.state(+newProposalId), states.Canceled);
  });
  /* it("Defeated", async () => {
      // travel to end block
      //await advanceBlocks(20000)
      console.log(await gov.proposals(trivialProposal.id))
      advanceBlockTo((await web3.eth.getBlockNumber()) + 17290 + delay)
      expectBignumberEqual(await gov.state(trivialProposal.id), states["Defeated"])
    })
    it("Succeeded", async () => {
      await mineBlock()
      const newProposalId = await gov.propose(targets, values,
        signatures, callDatas, "do nothing", { from: acct.address })
      await mineBlock()
      await gov.castVote(newProposalId, true)
      await advanceBlocks(20000)
      expectBignumberEqual(await gov.state(newProposalId), states["Succeeded"])
    })
    it("Queued", async () => {
      await mineBlock()
      const newProposalId  = await gov.propose(targets,
        values, signatures, callDatas, "do nothing", { from: acct.address })
      await mineBlock()
      await gov.castVote(newProposalId, true)
      await advanceBlocks(20000)
      await gov.queue(newProposalId, { from: acct.address })
      expectBignumberEqual(await gov.state(newProposalId), states["Queued"])
    })
    it("Expired", async () => {
      await mineBlock()
      const newProposalId = await gov.propose(targets, values,
        signatures, callDatas, "do nothing", { from: acct.address })
      await mineBlock()
      await gov.castVote(newProposalId, true)
      await advanceBlocks(20000)
      await increaseTime(1)
      await gov.queue(newProposalId, { from: acct })
      let gracePeriod = await call(timelock, 'GRACE_PERIOD')
      let p = await gov.proposals(newProposalId);
      let eta = etherUnsigned(p.eta)
      await freezeTime(eta.plus(gracePeriod).minus(1).toNumber())
      expectBignumberEqual(await gov.state(newProposalId), states["Queued"])
      await freezeTime(eta.plus(gracePeriod).toNumber())
      expectBignumberEqual(await gov.state(newProposalId), states["Expired"])
    })
    it("Executed", async () => {
      await mineBlock()
      const newProposalId = await gov.propose(targets, values,
        signatures, callDatas, "do nothing", { from: acct.address })
      await mineBlock()
      await gov.castVote(newProposalId, true)
      await advanceBlocks(20000)
      await increaseTime(1)
      await gov.queue(newProposalId, { from: acct.address })
      let gracePeriod = await call(timelock, 'GRACE_PERIOD')
      let p = await gov.proposals(newProposalId);
      let eta = etherUnsigned(p.eta)
      await freezeTime(eta.plus(gracePeriod).minus(1).toNumber())
      expectBignumberEqual(await gov.state(newProposalId), states["Queued"])
      await gov.execute(newProposalId, { from: acct.address })
      expectBignumberEqual(await gov.state(newProposalId), states["Executed"])
      // still executed even though would be expired
      await freezeTime(eta.plus(gracePeriod).toNumber())
      expectBignumberEqual(await gov.state(newProposalId), states["Executed"])
    }) */
});
