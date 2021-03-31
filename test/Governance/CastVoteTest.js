// const {artifacts, contract, web3} = require('hardhat');
const {artifacts} = require('hardhat');
const {expect} = require('chai');
const {
  address,
  mineBlock
} = require('../Utils/Ethereum');

const {expectBignumberEqual} = require('../../helpers/index');

const {
  shouldFailWithMessage,
  parseEther
} = require('../Utils/utils');

const Eul = artifacts.require('Eul');
const Gov = artifacts.require('Governance');
const Timelock = artifacts.require('Timelock');

// const EIP712 = require('../Utils/EIP712');

async function enfranchise(eul, actor, amount) {
  await eul.transfer(actor, amount);
  await eul.delegate(actor, {from: actor});
}

describe('Goverance#castVote/2', () => {
  let eul; let gov; let root; let a1; let
    accounts;
  let targets; let values; let signatures; let callDatas; let
    proposalId;
  let signers;

  before(async () => {
    signers = await ethers.getSigners();
    [root, a1, ...accounts] = signers;

    // Deploy Timelock contract
    // deploying timelock with delay of 2 days in seconds, i.e., 86400 seconds per day
    timelock = await Timelock.new(root.address, 86400 * 2, {from: root.address});

    // Deploy Euler governance token contract
    eul = await Eul.new(root.address, {from: root.address});

    // Deploy Governance contract
    gov = await Gov.new(address(0), eul.address, root.address, {from: root.address});

    targets = [a1.address];
    values = ['0'];
    signatures = ['getBalanceOf(address)'];
    callDatas = [ethers.utils.defaultAbiCoder.encode(['address'], [a1.address])];
    await eul.delegate(root.address);
    await gov.propose(targets, values, signatures, callDatas, 'do nothing');
    proposalId = await gov.latestProposalIds(root.address);
  });

  describe('We must revert if:', () => {
    it('There does not exist a proposal with matching proposal id where the current block number is between the proposals start block (exclusive) and end block (inclusive)', async () => {
      await shouldFailWithMessage(
        gov.castVote(proposalId, true),
        'Governance::_castVote: voting is closed'
      );
    });

    it('Such proposal already has an entry in its voters set matching the sender', async () => {
      await mineBlock();
      await mineBlock();

      await gov.castVote(proposalId, true, {from: accounts[4].address});
      await shouldFailWithMessage(
        gov.castVote(proposalId, true, {from: accounts[4].address}),
        'Governance::_castVote: voter already voted'
      );
    });
  });

  describe('Otherwise', () => {
    it('we add the sender to the proposal\'s voters set', async () => {
      const receipt1 = await gov.getReceipt(proposalId, accounts[2].address);
      expect(receipt1.hasVoted).to.be.equal(false);
      await gov.castVote(proposalId, true, {from: accounts[2].address});
      const receipt2 = await gov.getReceipt(proposalId, accounts[2].address);
      expect(receipt2.hasVoted).to.be.equal(true);
    });

    describe('and we take the balance returned by GetPriorVotes for the given sender and the proposal\'s start block, which may be zero,', () => {
      let actor; // an account that will propose,
      // receive tokens, delegate to self, and vote on own proposal

      it('and we add that ForVotes', async () => {
        actor = accounts[1].address;
        await enfranchise(eul, actor, parseEther('400001'));

        await gov.propose(targets, values, signatures, callDatas, 'do nothing', {from: actor});
        proposalId = await gov.latestProposalIds(actor);

        const beforeFors = (await gov.proposals(proposalId)).forVotes;
        await mineBlock();
        await gov.castVote(proposalId, true, {from: actor});

        const afterFors = (await gov.proposals(proposalId)).forVotes;

        expectBignumberEqual(afterFors, parseEther('400001'));
      });

      it('or AgainstVotes corresponding to the caller\'s support flag.', async () => {
        actor = accounts[3].address;
        await enfranchise(eul, actor, parseEther('400001'));

        await gov.propose(targets, values, signatures, callDatas, 'do nothing', {from: actor});
        proposalId = await gov.latestProposalIds(actor);

        const beforeAgainsts = (await gov.proposals(proposalId)).againstVotes;
        await mineBlock();
        await gov.castVote(proposalId, false, {from: actor});

        const afterAgainsts = (await gov.proposals(proposalId)).againstVotes;
        expectBignumberEqual(afterAgainsts, parseEther((400001 * 2).toString()));
      });
    });

    /*       describe('castVoteBySig', () => {
        const Domain = (gov) => ({
          name: 'Governance',
          chainId: 1, // await web3.eth.net.getId(); See: https://github.com/trufflesuite/ganache-core/issues/515
          verifyingContract: gov._address
        });
        const Types = {
          Ballot: [
            { name: 'proposalId', type: 'uint256' },
            { name: 'support', type: 'bool' }
          ]
        };

        it('reverts if the signatory is invalid', async () => {
          await shouldFailWithMessage(
            gov.castVoteBySig(
              proposalId, false, 0, '0xbad', '0xbad'
            ), "Governance::castVoteBySig: invalid signature");
        });

        it('casts vote on behalf of the signatory', async () => {
          await enfranchise(eul, a1.address, parseEther('400001'));
          await gov.propose(targets, values, signatures,
            callDatas, "do nothing", { from: a1.address });
          proposalId = await gov.latestProposalIds(a1.address);

          const { v, r, s } = EIP712.sign(Domain(gov), 'Ballot',
          { proposalId, support: true }, Types,
          unlockedAccount(a1.address).secretKey);

          let beforeFors = (await gov.proposals(proposalId)).forVotes;
          await mineBlock();
          const tx = await gov.castVoteBySig(proposalId, true, v, r, s);
          expect(tx.gasUsed < 80000);

          let afterFors = (await gov.proposals(proposalId)).forVotes;
          expectBignumberEqual(afterFors, parseEther((400001*2).toString()));
        });
      }); */

    it('receipt uses one load', async () => {
      const actor = accounts[2].address;
      const actor2 = accounts[3].address;
      await enfranchise(eul, actor, parseEther('400001'));
      await enfranchise(eul, actor2, parseEther('400001'));
      await gov.propose(targets, values, signatures, callDatas, 'do nothing', {from: actor});
      proposalId = await gov.latestProposalIds(actor);

      await mineBlock();
      await mineBlock();
      await gov.castVote(proposalId, true, {from: actor});
      await gov.castVote(proposalId, false, {from: actor2});

      const trxReceipt = await gov.getReceipt(proposalId, actor);
      const trxReceipt2 = await gov.getReceipt(proposalId, actor2);

      expect(trxReceipt.hasVoted).to.be.equal(true);
      expect(trxReceipt.support).to.be.equal(true);
      expectBignumberEqual(trxReceipt.votes, parseEther('400001'));

      expect(trxReceipt2.hasVoted).to.be.equal(true);
      expect(trxReceipt2.support).to.be.equal(false);
      expectBignumberEqual(trxReceipt2.votes, parseEther('400001'));
    });
  });
});
