const {artifacts, ethers, web3} = require('hardhat');
const {expect} = require('chai');
const {
  address,
  mineBlock
} = require('../Utils/Ethereum');

const {
  findEventInTransaction

} = require('../Utils/events');

const {expectBignumberEqual} = require('../../helpers/index');

const {
  shouldFailWithMessage,
  parseEther
} = require('../Utils/utils');

const Eul = artifacts.require('Eul');
const Gov = artifacts.require('Governance');
const Timelock = artifacts.require('Timelock');

describe('Goverance#propose/5', () => {
  let root; let
    acct;
  let signers;
  let eul; let timelock; let
    gov;
  before(async () => {
    signers = await ethers.getSigners();
    [root, acct, ...accounts] = signers;

    // Deploy Timelock contract
    // deploying timelock with delay of 2 days in seconds, i.e., 86400 seconds per day
    timelock = await Timelock.new(root.address, 86400 * 2, {from: root.address});

    // Deploy Euler governance token contract
    eul = await Eul.new(root.address, {from: root.address});

    // Deploy Governance contract
    gov = await Gov.new(address(0), eul.address, address(0), {from: root.address});
  });

  let trivialProposal; let targets; let values; let signatures; let
    callDatas;
  let proposalBlock;

  before(async () => {
    targets = [root.address];
    values = ['0'];
    signatures = ['getBalanceOf(address)'];
    callDatas = [ethers.utils.defaultAbiCoder.encode(['address'], [acct.address])];
    await eul.delegate(root.address);
    await gov.propose(targets, values, signatures, callDatas, 'do nothing');
    proposalBlock = await web3.eth.getBlockNumber();
    proposalId = await gov.latestProposalIds(root.address);
    trivialProposal = await gov.proposals(proposalId);
  });

  xit('Given the sender\'s GetPriorVotes for the immediately previous block is above the Proposal Threshold (e.g. 2%), the given proposal is added to all proposals, given the following settings', async () => {
    test.todo('depends on get prior votes and delegation and voting');
  });

  describe('simple initialization', () => {
    it('ID is set to a globally unique identifier', async () => {
      expectBignumberEqual(trivialProposal.id, proposalId);
    });

    it('Proposer is set to the sender', async () => {
      expect(trivialProposal.proposer).to.equal(root.address);
    });

    it('Start block is set to the current block number plus vote delay', async () => {
      expectBignumberEqual(trivialProposal.startBlock, `${proposalBlock + 1}`);
    });

    it('End block is set to the current block number plus the sum of vote delay and vote period', async () => {
      expectBignumberEqual(trivialProposal.endBlock, `${proposalBlock + 1 + 17280}`);
    });

    it('ForVotes and AgainstVotes are initialized to zero', async () => {
      expectBignumberEqual(trivialProposal.forVotes, '0');
      expectBignumberEqual(trivialProposal.againstVotes, '0');
    });

    xit('Voters is initialized to the empty set', async () => {
      test.todo('mmm probably nothing to prove here unless we add a counter or something');
    });

    it('Executed and Canceled flags are initialized to false', async () => {
      expect(trivialProposal.canceled).to.equal(false);
      expect(trivialProposal.executed).to.equal(false);
    });

    it('ETA is initialized to zero', async () => {
      expectBignumberEqual(trivialProposal.eta, '0');
    });

    it('Targets, Values, Signatures, Calldatas are set according to parameters', async () => {
      const dynamicFields = await gov.getActions(trivialProposal.id);
      expect(dynamicFields.targets[0]).to.equal(targets[0]);
      // console.log('values', dynamicFields.values[0])
      // expect(dynamicFields.values).to.be.equsl(values[0]);
      expect(dynamicFields.signatures[0]).to.equal(signatures[0]);
      expect(dynamicFields.calldatas[0]).to.equal(callDatas[0]);
    });

    describe('This function must revert if', () => {
      it('the length of the values, signatures or calldatas arrays are not the same length,', async () => {
        await shouldFailWithMessage(
          gov.propose(targets.concat(root.address), values, signatures, callDatas, 'do nothing'),
          'Governance::propose: proposal function information arity mismatch'
        );

        await shouldFailWithMessage(
          gov.propose(targets, values.concat(values), signatures, callDatas, 'do nothing'),
          'Governance::propose: proposal function information arity mismatch'
        );

        await shouldFailWithMessage(
          gov.propose(targets, values, signatures.concat(signatures), callDatas, 'do nothing'),
          'Governance::propose: proposal function information arity mismatch'
        );

        await shouldFailWithMessage(
          gov.propose(targets, values, signatures, callDatas.concat(callDatas), 'do nothing'),
          'Governance::propose: proposal function information arity mismatch'
        );
      });

      it('or if that length is zero or greater than Max Operations.',
        async () => {
          await shouldFailWithMessage(
            gov.propose([], [], [], [], 'do nothing'),
            'Governance::propose: must provide actions'
          );
        });

      describe('Additionally, if there exists a pending or active proposal from the same proposer, we must revert.', () => {
        it('reverts with pending', async () => {
          await shouldFailWithMessage(
            gov.propose(targets, values, signatures, callDatas, 'do nothing'),
            'revert Governance::propose: one live proposal per proposer, found an already active proposal'
          );
        });

        it('reverts with active', async () => {
          await mineBlock();
          await mineBlock();

          await shouldFailWithMessage(
            gov.propose(targets, values, signatures, callDatas, 'do nothing'),
            'Governance::propose: one live proposal per proposer, found an already active proposal'
          );
        });
      });
    });

    it('This function returns the id of the newly created proposal. # proposalId(n) = succ(proposalId(n-1))', async () => {
      await eul.transfer(accounts[2].address, parseEther('400001'), {from: root.address});
      await eul.delegate(accounts[2].address, {from: accounts[2].address});
      await mineBlock();
      const nextProposal = await gov.propose(targets, values,
        signatures, callDatas, 'yoot', {from: accounts[2].address});
      const nextProposalId = await gov.latestProposalIds(accounts[2].address);

      expectBignumberEqual(+nextProposalId, +trivialProposal.id + 1);
    });

    it('emits log with id and description', async () => {
      await eul.transfer(accounts[3].address, parseEther('400001'));
      await eul.delegate(accounts[3].address, {from: accounts[3].address});
      await mineBlock();
      // let nextProposalId = await gov.propose(targets, values,
      // signatures, callDatas, "yoot", { from: accounts[3].address });

      findEventInTransaction(
        await gov.propose(targets, values, signatures, callDatas,
          'second proposal', {from: accounts[3].address}),
        'ProposalCreated'
      );
      // ).toHaveLog("ProposalCreated", {
      //   id: nextProposalId,
      //   targets: targets,
      //   values: values,
      //   signatures: signatures,
      //   calldatas: callDatas,
      //   startBlock: 14,
      //   endBlock: 17294,
      //   description: "second proposal",
      //   proposer: accounts[3].address
      // });
    });
  });
});
