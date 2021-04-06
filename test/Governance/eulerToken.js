const { expect } = require('chai');
const { artifacts } = require('hardhat');
const { ZERO_ADDRESS, getActorsAsync } = require('../../helpers/address');
const {
  deployEulerToken
} = require('../helpers/deploy');
const { expectBignumberEqual } = require('../../helpers/index');
const {
  shouldFailWithMessage, parseEther, toBN
} = require('../../helpers/utils');
const {
  mineBlock,
  minerStart,
  minerStop
} = require('../helpers/Ethereum');
const testHelpers = require('@openzeppelin/test-helpers');

describe('Euler token contract: usage tests', () => {
  let accounts;
  let owner;
  let name;
  let symbol;
  let eulerTokenInstance;
  let chainId;
  let a1, a2, a3;

  beforeEach(async () => {
    chainId = 1; // await web3.eth.net.getId(); See: https://github.com/trufflesuite/ganache-core/issues/515
    accounts = await web3.eth.getAccounts();
    a1 = accounts[1];
    a2 = accounts[2];
    a3 = accounts[3];
    name = 'Euler';
    symbol = 'EUL';
    [eulerTokenInstance, {owner}] = await deployEulerToken(accounts);
  });

  describe('metadata', () => {

    it('has given name', async () => {
      expect(await eulerTokenInstance.name()).to.be.equal(name);
    });

    it('has given symbol', async () => {
      expect(await eulerTokenInstance.symbol()).to.be.equal(symbol);
    });
  });

  describe('balanceOf', () => {
    it('grants to initial account', async () => {
      expectBignumberEqual(await eulerTokenInstance.balanceOf(owner), parseEther('10000000'));
    });
  });

  ////// todo - DEBUG

  describe('delegateBySig', () => {
/* 
    const Domain = eul => ({ name, chainId, verifyingContract: eulerTokenInstance.address });
    const Types = {
      Delegation: [{ name: 'delegatee', type: 'address' }, { name: 'nonce', type: 'uint256' }, { name: 'expiry', type: 'uint256' }]
    };
*/
    xit('reverts if the signatory is invalid', async () => {
      /* const delegatee = owner; const nonce = 0; const
        expiry = 0;
      await shouldFailWithMessage(
        eulerTokenInstance.delegateBySig(delegatee, nonce, expiry, 0, '0xbad', '0xbad'),
        'Eul::delegateBySig: invalid signature'
      ); */
    });

    xit('reverts if the nonce is bad ', async () => {
      /* const delegatee = owner; const nonce = 1; const
        expiry = 0;
      const { v, r, s } = EIP712.sign(Domain(eul), 'Delegation',
        { delegatee, nonce, expiry }, Types, a1.signingKey);
      await shouldFailWithMessage(
        eulerTokenInstance.delegateBySig(delegatee, nonce, expiry, v, r, s),
        'Eul::delegateBySig: invalid nonce'
      ); */
    });

    xit('reverts if the signature has expired', async () => {
      /* const delegatee = owner; const nonce = 0; const
        expiry = 0;
      const { v, r, s } = EIP712.sign(Domain(eul), 'Delegation',
        { delegatee, nonce, expiry }, Types, unlockedAccount(a1).secretKey);
      await shouldFailWithMessage(eulerTokenInstance.delegateBySig(
        delegatee, nonce, expiry, v, r, s), 'Eul::delegateBySig: signature expired'); */
    });

    xit('delegates on behalf of the signatory', async () => {
      /**const delegatee = owner; const nonce = 0; const
        expiry = 10e9;
      const { v, r, s } = EIP712.sign(Domain(eul), 'Delegation',
        { delegatee, nonce, expiry }, Types, unlockedAccount(a1).secretKey);
      expect(await eulerTokenInstance.delegates(a1)).to.equal(address(0));
      const tx = await eulerTokenInstance.delegateBySig(delegatee, nonce, expiry, v, r, s);
      expect(tx.gasUsed < 80000);
      expect(await eulerTokenInstance.delegates(a1)).to.equal(owner);*/
    });
  });

  describe('numCheckpoints', () => {
    it('returns the number of checkpoints for a delegate', async () => {
      const guy = accounts[4];
      await eulerTokenInstance.transfer(guy, '100', {from: owner}); // give an account a few tokens for readability
      await expectBignumberEqual(await eulerTokenInstance.numCheckpoints(a1), '0');

      const t1 = await eulerTokenInstance.delegate(a1, { from: guy });
      await expectBignumberEqual(await eulerTokenInstance.numCheckpoints(a1), '1');

      const t2 = await eulerTokenInstance.transfer(a2, 10, { from: guy });
      await expectBignumberEqual(await eulerTokenInstance.numCheckpoints(a1), '2');

      const t3 = await eulerTokenInstance.transfer(a2, 10, { from: guy });
      await expectBignumberEqual(await eulerTokenInstance.numCheckpoints(a1), '3');

      const t4 = await eulerTokenInstance.transfer(guy, 20, { from: owner });
      await expectBignumberEqual(await eulerTokenInstance.numCheckpoints(a1), '4');

      await expectBignumberEqual((await eulerTokenInstance.checkpoints(a1, 0)).fromBlock.toString(), (t1.receipt.blockNumber).toString());
      await expectBignumberEqual((await eulerTokenInstance.checkpoints(a1, 0)).votes.toString(), '100');
      
      await expectBignumberEqual((await eulerTokenInstance.checkpoints(a1, 1)).fromBlock.toString(), (t2.receipt.blockNumber).toString());
      await expectBignumberEqual((await eulerTokenInstance.checkpoints(a1, 1)).votes.toString(), '90');
      
      await expectBignumberEqual((await eulerTokenInstance.checkpoints(a1, 2)).fromBlock.toString(), (t3.receipt.blockNumber).toString());
      await expectBignumberEqual((await eulerTokenInstance.checkpoints(a1, 2)).votes.toString(), '80');
      
      await expectBignumberEqual((await eulerTokenInstance.checkpoints(a1, 3)).fromBlock.toString(), (t4.receipt.blockNumber).toString());
      await expectBignumberEqual((await eulerTokenInstance.checkpoints(a1, 3)).votes.toString(), '100');
    });

    it('does not add more than one checkpoint in a block', async () => {
      const guy = accounts[4];

      await eulerTokenInstance.transfer(guy, '100', {from: owner}); // give an account a few tokens for readability
      await expectBignumberEqual(await eulerTokenInstance.numCheckpoints(a1), '0');
      await minerStop();

      let t1 = eulerTokenInstance.delegate(a1, { from: guy });
      let t2 = eulerTokenInstance.transfer(a2, 10, { from: guy });
      let t3 = eulerTokenInstance.transfer(a2, 10, { from: guy });

      await minerStart();
      t1 = await t1;
      t2 = await t2;
      t3 = await t3;

      await expectBignumberEqual(await eulerTokenInstance.numCheckpoints(a1), '3');

      await expectBignumberEqual((await eulerTokenInstance.checkpoints(a1, 0)).fromBlock.toString(), (t1.receipt.blockNumber).toString());
      await expectBignumberEqual((await eulerTokenInstance.checkpoints(a1, 0)).votes.toString(), '100');
      
      await expectBignumberEqual((await eulerTokenInstance.checkpoints(a1, 1)).fromBlock.toString(), '18');
      await expectBignumberEqual((await eulerTokenInstance.checkpoints(a1, 1)).votes.toString(), '90');
      
      await expectBignumberEqual((await eulerTokenInstance.checkpoints(a1, 0)).fromBlock.toString(), '17');
      await expectBignumberEqual((await eulerTokenInstance.checkpoints(a1, 0)).votes.toString(), '100');

      const t4 = await eulerTokenInstance.transfer(guy, 20, { from: owner });
      await expectBignumberEqual(await eulerTokenInstance.numCheckpoints(a1), '4');

      await expectBignumberEqual((await eulerTokenInstance.checkpoints(a1, 1)).fromBlock.toString(), '18');
      await expectBignumberEqual((await eulerTokenInstance.checkpoints(a1, 1)).votes.toString(), '90');
      
    });
  });

  describe('getPriorVotes', () => {
    it('reverts if block number >= current block', async () => {
      await shouldFailWithMessage(eulerTokenInstance.getPriorVotes(
        a1, 5e10
      ), 'revert Eul::getPriorVotes: not yet determined');
    });

    it('returns 0 if there are no checkpoints', async () => {
      expectBignumberEqual(await eulerTokenInstance.getPriorVotes(a1, 0), '0');
    });

    it('returns the latest block if >= last checkpoint block', async () => {
      const t1 = await eulerTokenInstance.delegate(a1, { from: owner });
      await mineBlock();
      await mineBlock();

      expectBignumberEqual(await eulerTokenInstance.getPriorVotes(
        a1, t1.receipt.blockNumber
      ), '10000000000000000000000000');
      expectBignumberEqual(await eulerTokenInstance.getPriorVotes(
        a1, t1.receipt.blockNumber + 1
      ), '10000000000000000000000000');
    });

    it('returns zero if < first checkpoint block', async () => {
      await mineBlock();
      const t1 = await eulerTokenInstance.delegate(a1, { from: owner });
      await mineBlock();
      await mineBlock();

      expectBignumberEqual(await eulerTokenInstance.getPriorVotes(
        a1, t1.receipt.blockNumber - 1
      ), '0');
      expectBignumberEqual(await eulerTokenInstance.getPriorVotes(
        a1, t1.receipt.blockNumber + 1
      ), '10000000000000000000000000');
    });

    it('generally returns the voting balance at the appropriate checkpoint', async () => {
      const t1 = await eulerTokenInstance.delegate(a1, { from: owner });
      await mineBlock();
      await mineBlock();
      const t2 = await eulerTokenInstance.transfer(a2, 10, { from: owner });
      await mineBlock();
      await mineBlock();
      const t3 = await eulerTokenInstance.transfer(a2, 10, { from: owner });
      await mineBlock();
      await mineBlock();
      const t4 = await eulerTokenInstance.transfer(owner, 20, { from: a2 });
      await mineBlock();
      await mineBlock();

      expectBignumberEqual(
        await eulerTokenInstance.getPriorVotes(a1, t1.receipt.blockNumber - 1),
        '0'
      );
      expectBignumberEqual(
        await eulerTokenInstance.getPriorVotes(a1, t1.receipt.blockNumber),
        parseEther('10000000')
      );
      expectBignumberEqual(
        await eulerTokenInstance.getPriorVotes(a1, t1.receipt.blockNumber + 1),
        parseEther('10000000')
      );
      expectBignumberEqual(
        await eulerTokenInstance.getPriorVotes(a1, t2.receipt.blockNumber),
        '9999999999999999999999990'
      );
      expectBignumberEqual(
        await eulerTokenInstance.getPriorVotes(a1, t2.receipt.blockNumber + 1),
        '9999999999999999999999990'
      );
      expectBignumberEqual(
        await eulerTokenInstance.getPriorVotes(a1, t3.receipt.blockNumber),
        '9999999999999999999999980'
      );
      expectBignumberEqual(
        await eulerTokenInstance.getPriorVotes(a1, t3.receipt.blockNumber + 1),
        '9999999999999999999999980'
      );
      expectBignumberEqual(
        await eulerTokenInstance.getPriorVotes(a1, t4.receipt.blockNumber),
        parseEther('10000000')
      );
      expectBignumberEqual(await eulerTokenInstance.getPriorVotes(
        a1, t4.receipt.blockNumber + 1
      ),
      parseEther('10000000'));
    });
  });

});
