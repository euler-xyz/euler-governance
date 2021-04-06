const { expect } = require('chai');
const { artifacts } = require('hardhat');
const { ZERO_ADDRESS, getActorsAsync } = require('../../helpers/address');
const {
  deployGovernance
} = require('../helpers/deploy');
const { expectBignumberEqual } = require('../../helpers/index');
const {
  shouldFailWithMessage, parseEther, toBN
} = require('../../helpers/utils');
const {
  findEventInTransaction
} = require('../../helpers/events')
const {
  mineBlock,
  minerStart,
  minerStop
} = require('../helpers/Ethereum');

describe('Goverance contract: proposals', () => {
  let accounts; let acct;
  let govInstance; let owner; let timelockInstance; let eulerTokenInstance;
  let trivialProposal; let targets; let values; let signatures; 
  let callDatas; let proposalBlock;

  before(async () => {

    [
      govInstance,
      {
          owner,
          timelockInstance,
          eulerTokenInstance
      }
    ] = await deployGovernance(accounts);

    accounts = await web3.eth.getAccounts();
    targets = [owner];
    values = ['0'];
    signatures = ['getBalanceOf(address)'];
    callDatas = [ethers.utils.defaultAbiCoder.encode(['address'], [owner])];
    await eulerTokenInstance.delegate(owner);
    await govInstance.propose(targets, values, signatures, callDatas, 'do nothing', {from: owner});
    proposalBlock = await web3.eth.getBlockNumber();
    proposalId = await govInstance.latestProposalIds(owner);
    trivialProposal = await govInstance.proposals(proposalId);
  });

  xit('Given the sender\'s GetPriorVotes for the immediately previous block is above the Proposal Threshold (e.g. 2%), the given proposal is added to all proposals, given the following settings', async () => {
    test.todo('depends on get prior votes and delegation and voting');
  });

  describe('simple initialization', () => {
    it('ID is set to a globally unique identifier', async () => {
      expectBignumberEqual(trivialProposal.id, proposalId);
    });

    it('Proposer is set to the sender', async () => {
      expect(trivialProposal.proposer).to.equal(owner);
    });

    it('Start block is set to the current block number plus vote delay', async () => {
      expectBignumberEqual(trivialProposal.startBlock, `${proposalBlock + 1}`);
    });

    it('End block is set to the current block number plus the sum of vote delay and vote period', async () => {
      // expectBignumberEqual(trivialProposal.endBlock, `${proposalBlock + 1 + 17280}`);
      expectBignumberEqual(trivialProposal.endBlock, `${proposalBlock + 1 + 20}`); // using 20 blocks for voting period in tests
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
      const dynamicFields = await govInstance.getActions(trivialProposal.id);
      expect(dynamicFields.targets[0]).to.equal(targets[0]);
      // console.log('values', dynamicFields.values[0])
      // expect(dynamicFields.values).to.be.equsl(values[0]);
      expect(dynamicFields.signatures[0]).to.equal(signatures[0]);
      expect(dynamicFields.calldatas[0]).to.equal(callDatas[0]);
    });

    describe('This function must revert if', () => {
      it('the length of the values, signatures or calldatas arrays are not the same length,', async () => {
        await shouldFailWithMessage(
          govInstance.propose(targets.concat(owner), values, signatures, callDatas, 'do nothing'),
          'Governance::propose: proposal function information arity mismatch'
        );

        await shouldFailWithMessage(
          govInstance.propose(targets, values.concat(values), signatures, callDatas, 'do nothing'),
          'Governance::propose: proposal function information arity mismatch'
        );

        await shouldFailWithMessage(
          govInstance.propose(targets, values, signatures.concat(signatures), callDatas, 'do nothing'),
          'Governance::propose: proposal function information arity mismatch'
        );

        await shouldFailWithMessage(
          govInstance.propose(targets, values, signatures, callDatas.concat(callDatas), 'do nothing'),
          'Governance::propose: proposal function information arity mismatch'
        );
      });

      it('or if that length is zero or greater than Max Operations.',
        async () => {
          await shouldFailWithMessage(
            govInstance.propose([], [], [], [], 'do nothing'),
            'Governance::propose: must provide actions'
          );
        });

      describe('Additionally, if there exists a pending or active proposal from the same proposer, we must revert.', () => {
        it('reverts with pending', async () => {
          await shouldFailWithMessage(
            govInstance.propose(targets, values, signatures, callDatas, 'do nothing'),
            'revert Governance::propose: one live proposal per proposer, found an already active proposal'
          );
        });

        it('reverts with active', async () => {
          await mineBlock();
          await mineBlock();

          await shouldFailWithMessage(
            govInstance.propose(targets, values, signatures, callDatas, 'do nothing'),
            'Governance::propose: one live proposal per proposer, found an already active proposal'
          );
        });
      });
    });

    it('This function returns the id of the newly created proposal. # proposalId(n) = succ(proposalId(n-1))', async () => {
      await eulerTokenInstance.transfer(accounts[2], parseEther('400001'), {from: owner});
      await eulerTokenInstance.delegate(accounts[2], {from: accounts[2]});
      await mineBlock();
      const nextProposal = await govInstance.propose(targets, values,
        signatures, callDatas, 'yoot', {from: accounts[2]});
      const nextProposalId = await govInstance.latestProposalIds(accounts[2]);

      expectBignumberEqual(+nextProposalId, +trivialProposal.id + 1);
    });

    it('emits log with id and description', async () => {
      await eulerTokenInstance.transfer(accounts[3], parseEther('400001'));
      await eulerTokenInstance.delegate(accounts[3], {from: accounts[3]});
      await mineBlock();
      // let nextProposalId = await govInstance.propose(targets, values,
      // signatures, callDatas, "yoot", { from: accounts[3] });

      findEventInTransaction(
        await govInstance.propose(targets, values, signatures, callDatas,
          'second proposal', {from: accounts[3]}),
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
      //   proposer: accounts[3]
      // });
    });
  });
});
