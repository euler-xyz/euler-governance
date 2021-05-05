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
  minerStop,
  unlockedAccounts,
  unlockedAccount
} = require('../helpers/Ethereum');

const {
  encodeType,
  typeHash,
  encodeData,
  domainSeparator,
  structHash,
  digestToSign,
  sign
} = require('../helpers/EIP712');

const EIP712 = require('../helpers/eip_712');

describe('Goverance contract: voting', () => {
  let accounts; let acct; let a1;
  let govInstance; let owner; let timelockInstance; let eulerTokenInstance;
  let trivialProposal; let targets; let values; let signatures; 
  let callDatas; let proposalBlock;
  let chainId;

  before(async () => {
    chainId = await web3.eth.net.getId();

    [
      govInstance,
      {
          owner,
          timelockInstance,
          eulerTokenInstance
      }
    ] = await deployGovernance(accounts);

    accounts = await web3.eth.getAccounts();
    a1 = accounts[1];
    targets = [a1];
    values = ['0'];
    signatures = ['getBalanceOf(address)'];
    callDatas = [ethers.utils.defaultAbiCoder.encode(['address'], [owner])];
    await eulerTokenInstance.delegate(owner);
    await govInstance.propose(targets, values, signatures, callDatas, 'do nothing', {from: owner});
    proposalBlock = await web3.eth.getBlockNumber();
    proposalId = await govInstance.latestProposalIds(owner);
    trivialProposal = await govInstance.proposals(proposalId);
  });

  async function enfranchise(eulerTokenInstance, actor, amount) {
    await eulerTokenInstance.transfer(actor, amount);
    await eulerTokenInstance.delegate(actor, {from: actor});
  }

  describe('We must revert if:', () => {
    it('There does not exist a proposal with matching proposal id where the current block number is between the proposals start block (exclusive) and end block (inclusive)', async () => {
      await shouldFailWithMessage(
        govInstance.castVote(proposalId, true),
        'Governance::_castVote: voting is closed'
      );
    });

    it('Such proposal already has an entry in its voters set matching the sender', async () => {
      await mineBlock();
      await mineBlock();

      await govInstance.castVote(proposalId, true, {from: accounts[4]});
      await shouldFailWithMessage(
        govInstance.castVote(proposalId, true, {from: accounts[4]}),
        'Governance::_castVote: voter already voted'
      );
    });
  });

  describe('Otherwise', () => {
    it('we add the sender to the proposal\'s voters set', async () => {
      const receipt1 = await govInstance.getReceipt(proposalId, accounts[2]);
      expect(receipt1.hasVoted).to.be.equal(false);
      await govInstance.castVote(proposalId, true, {from: accounts[2]});
      const receipt2 = await govInstance.getReceipt(proposalId, accounts[2]);
      expect(receipt2.hasVoted).to.be.equal(true);
    });

    describe('and we take the balance returned by GetPriorVotes for the given sender and the proposal\'s start block, which may be zero,', () => {
      let actor; // an account that will propose,
      // receive tokens, delegate to self, and vote on own proposal

      it('and we add that ForVotes', async () => {
        actor = accounts[1];
        await enfranchise(eulerTokenInstance, actor, parseEther('400001'));

        await govInstance.propose(targets, values, signatures, callDatas, 'do nothing', {from: actor});
        proposalId = await govInstance.latestProposalIds(actor);

        const beforeFors = (await govInstance.proposals(proposalId)).forVotes;
        await mineBlock();
        await govInstance.castVote(proposalId, true, {from: actor});

        const afterFors = (await govInstance.proposals(proposalId)).forVotes;

        expectBignumberEqual(afterFors, parseEther('400001'));
      });

      it('or AgainstVotes corresponding to the caller\'s support flag.', async () => {
        actor = accounts[3];
        await enfranchise(eulerTokenInstance, actor, parseEther('400001'));

        await govInstance.propose(targets, values, signatures, callDatas, 'do nothing', {from: actor});
        proposalId = await govInstance.latestProposalIds(actor);

        const beforeAgainsts = (await govInstance.proposals(proposalId)).againstVotes;
        await mineBlock();
        await govInstance.castVote(proposalId, false, {from: actor});

        const afterAgainsts = (await govInstance.proposals(proposalId)).againstVotes;
        expectBignumberEqual(afterAgainsts, parseEther((400001 * 2).toString()));
      });
    });

    describe('castVoteBySig', () => {
        const Domain = (govInstance) => ({
          name: 'Governance',
          chainId: 1, // await web3.eth.net.getId(); See: https://github.com/trufflesuite/ganache-core/issues/515
          verifyingContract: govInstance.address
        });
        const Types = {
          Ballot: [
            { name: 'proposalId', type: 'uint256' },
            { name: 'support', type: 'bool' }
          ]
        };

        it('reverts if the signatory is invalid', async () => {
          await shouldFailWithMessage(
            govInstance.castVoteBySig(
              proposalId, false, 0, '0xbad', '0xbad'
            ), "Governance::castVoteBySig: invalid signature");
        });

        xit('casts vote on behalf of the signatory', async () => {
          

          const signer = accounts[5];
          const sender = accounts[0];

          await mineBlock();
          await mineBlock();
          await enfranchise(eulerTokenInstance, signer, parseEther('400001'));
          

          await govInstance.propose(targets, values, signatures,
            callDatas, "do nothing", { from: signer });
          let proposalId = await govInstance.latestProposalIds(signer);

          // create EIP712 signature
          

          const domain = [
            { name: "name", type: "string" },
            //{ name: "version", type: "string" },
            { name: "chainId", type: "uint256" },
            { name: "verifyingContract", type: "address" },
            //{ name: "salt", type: "bytes32" },
        ];
        
          /* const data = {
            types: Object.assign({
              EIP712Domain: domain,
          }, Types),
            domain: Domain(govInstance),
            primaryType: "Ballot",
            message: {
              proposalId: proposalId,
              support: true
            }
        }; */
        

          const typedData = EIP712.createTypeData(
            Types,
            "Ballot",
            Domain(govInstance), 
            {
              proposalId: proposalId,
              support: true
            });
          const sig = await EIP712.signTypedData(web3, signer, typedData);
          //console.log("users signature", sig) 
          
         let beforeFors = (await govInstance.proposals(proposalId)).forVotes;
          expectBignumberEqual(beforeFors, '0');
          
          await mineBlock();
          await mineBlock();
          await mineBlock();
          let startblock = (await govInstance.proposals(proposalId)).startBlock;
          expectBignumberEqual(
            await eulerTokenInstance.getPriorVotes(signer, startblock),
            parseEther((400001).toString())
          );
          
          const tx = await govInstance.castVoteBySig(proposalId, true, sig.v, sig.r, sig.s, {from: sender});
          expect(tx.gasUsed < 80000);

          console.log(chainId.toString())
          console.log((await govInstance.getChainId()).toString())
          console.log(sig)

          console.log(signer)

          console.log(tx.logs[0].args)
          //let afterFors = (await govInstance.proposals(proposalId)).forVotes;
          //expectBignumberEqual(afterFors, parseEther((400001).toString()));

        }); 
      }); 

    it('receipt uses one load', async () => {
      const actor = accounts[2];
      const actor2 = accounts[3];
      await enfranchise(eulerTokenInstance, actor, parseEther('400001'));
      await enfranchise(eulerTokenInstance, actor2, parseEther('400001'));
      await govInstance.propose(targets, values, signatures, callDatas, 'do nothing', {from: actor});
      proposalId = await govInstance.latestProposalIds(actor);

      await mineBlock();
      await mineBlock();
      await govInstance.castVote(proposalId, true, {from: actor});
      await govInstance.castVote(proposalId, false, {from: actor2});

      const trxReceipt = await govInstance.getReceipt(proposalId, actor);
      const trxReceipt2 = await govInstance.getReceipt(proposalId, actor2);

      expect(trxReceipt.hasVoted).to.be.equal(true);
      expect(trxReceipt.support).to.be.equal(true);
      expectBignumberEqual(trxReceipt.votes, parseEther('400001'));

      expect(trxReceipt2.hasVoted).to.be.equal(true);
      expect(trxReceipt2.support).to.be.equal(false);
      expectBignumberEqual(trxReceipt2.votes, parseEther('400001'));
    });
  });

});
