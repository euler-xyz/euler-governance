/* const {expect} = require('chai');
const {
  mineBlock
} = require('../Utils/Ethereum');
// const EIP712 = require('../Utils/EIP712');
const {
  shouldFailWithMessage
} = require('../Utils/utils');
const {expectBignumberEqual} = require('../../helpers/index');

const Eul = artifacts.require('Eul');

describe('Eul', () => {
  const name = 'Euler';
  const symbol = 'EUL';

  let root; let a1; let a2; let
    chainId;
  let eul;
  let signers;

  beforeEach(async () => {
    signers = await ethers.getSigners();
    [
      root,
      a1,
      a2,
      ...accounts
    ] = signers;
    chainId = 1; // await web3.eth.net.getId(); See: https://github.com/trufflesuite/ganache-core/issues/515

    // Deploy Euler governance token contract
    eul = await Eul.new(root.address, {from: root.address});
  });

  describe('metadata', () => {
    it('has given name', async () => {
      expect(await eul.name()).to.equal(name);
    });

    it('has given symbol', async () => {
      expect(await eul.symbol()).to.equal(symbol);
    });
  });

  describe('balanceOf', () => {
    it('grants to initial account', async () => {
      expectBignumberEqual(await eul.balanceOf(root.address), '10000000000000000000000000');
    });
  });

  describe('delegateBySig', () => {
    const Domain = eul => ({name, chainId, verifyingContract: eul.address});
    const Types = {
      Delegation: [{name: 'delegatee', type: 'address'}, {name: 'nonce', type: 'uint256'}, {name: 'expiry', type: 'uint256'}]
    };

    it('reverts if the signatory is invalid', async () => {
      const delegatee = root.address; const nonce = 0; const
        expiry = 0;
      await shouldFailWithMessage(
        eul.delegateBySig(delegatee, nonce, expiry, 0, '0xbad', '0xbad'),
        'Eul::delegateBySig: invalid signature'
      );
    });

    it('reverts if the nonce is bad ', async () => {
      const delegatee = root.address; const nonce = 1; const
        expiry = 0;
      const {v, r, s} = EIP712.sign(Domain(eul), 'Delegation',
      {delegatee, nonce, expiry}, Types, a1.signingKey);
      await shouldFailWithMessage(
        eul.delegateBySig(delegatee, nonce, expiry, v, r, s),
        'Eul::delegateBySig: invalid nonce'
      );
    }); 

     it('reverts if the signature has expired', async () => {
      const delegatee = root.address; const nonce = 0; const
        expiry = 0;
      const {v, r, s} = EIP712.sign(Domain(eul), 'Delegation',
      {delegatee, nonce, expiry}, Types, unlockedAccount(a1).secretKey);
      await shouldFailWithMessage(eul.delegateBySig(
        delegatee, nonce, expiry, v, r, s), 'Eul::delegateBySig: signature expired');
    }); */

    /* it('delegates on behalf of the signatory', async () => {
      const delegatee = root.address; const nonce = 0; const
        expiry = 10e9;
      const {v, r, s} = EIP712.sign(Domain(eul), 'Delegation',
      {delegatee, nonce, expiry}, Types, unlockedAccount(a1).secretKey);
      expect(await eul.delegates(a1)).to.equal(address(0));
      const tx = await eul.delegateBySig(delegatee, nonce, expiry, v, r, s);
      expect(tx.gasUsed < 80000);
      expect(await eul.delegates(a1)).to.equal(root);
    }); 
  });

  describe('numCheckpoints', () => {
    it('returns the number of checkpoints for a delegate', async () => {
      const guy = accounts[0].address;
      await eul.transfer(guy, '100'); // give an account a few tokens for readability
      await expectBignumberEqual(await eul.numCheckpoints(a1.address), '0');

      const t1 = await eul.delegate(a1.address, {from: guy});
      await expectBignumberEqual(await eul.numCheckpoints(a1.address), '1');

      const t2 = await eul.transfer(a2.address, 10, {from: guy});
      await expectBignumberEqual(await eul.numCheckpoints(a1.address), '2');

      const t3 = await eul.transfer(a2.address, 10, {from: guy});
      await expectBignumberEqual(await eul.numCheckpoints(a1.address), '3');

      const t4 = await eul.transfer(guy, 20, {from: root.address});
      await expectBignumberEqual(await eul.numCheckpoints(a1.address), '4');

      await expect(eul.checkpoints(a1.address, 0)).to.have.members(
        {fromBlock: t1.receipt.blockNumber.toString(), votes: '100'});
      await expect(eul.checkpoints(a1.address, 1)).to.have.members(
        {fromBlock: t2.receipt.blockNumber.toString(), votes: '90'});
      await expect(eul.checkpoints(a1.address, 2)).to.have.members(
        {fromBlock: t3.receipt.blockNumber.toString(), votes: '80'});
      await expect(eul.checkpoints(a1.address, 3)).to.have.members(
        {fromBlock: t4.receipt.blockNumber.toString(), votes: '100'});
    });

    it('does not add more than one checkpoint in a block', async () => {
      const guy = accounts[0].address;

      await eul.transfer(guy, '100'); // give an account a few tokens for readability
      await expectBignumberEqual(await eul.numCheckpoints(a1.address), '0');
      await minerStop();

      let t1 = eul.delegate(a1.address, {from: guy});
      let t2 = eul.transfer(a2.address, 10, {from: guy});
      let t3 = eul.transfer(a2.address, 10, {from: guy});

      await minerStart();
      t1 = await t1;
      t2 = await t2;
      t3 = await t3;

      await expectBignumberEqual(await eul.numCheckpoints(a1.address), '1');

      await expect(eul.checkpoints(a1.address, 0)).to.be.equal(
        expect.objectContaining({fromBlock: t1.receipt.blockNumber.toString(), votes: '80'}));
      await expect(eul.checkpoints(a1.address, 1)).to.be.equal(
        expect.objectContaining({fromBlock: '0', votes: '0'}));
      await expect(eul.checkpoints(a1.address, 2)).to.be.equal(
        expect.objectContaining({fromBlock: '0', votes: '0'}));

      const t4 = await eul.transfer(guy, 20, {from: root});
      await expectawait(eul.numCheckpoints(a1.address)).to.be.equal('2');
      await expect(eul.checkpoints(a1.address, 1)).to.be.equal(
        expect.objectContaining({fromBlock: t4.receipt.blockNumber.toString(), votes: '100'}));
    });
  });

  describe('getPriorVotes', () => {
    it('reverts if block number >= current block', async () => {
      await shouldFailWithMessage(eul.getPriorVotes(
        a1.address, 5e10
      ), 'revert Eul::getPriorVotes: not yet determined');
    });

    it('returns 0 if there are no checkpoints', async () => {
      expectBignumberEqual(await eul.getPriorVotes(a1.address, 0), '0');
    });

    it('returns the latest block if >= last checkpoint block', async () => {
      const t1 = await eul.delegate(a1.address, {from: root.address});
      await mineBlock();
      await mineBlock();

      expectBignumberEqual(await eul.getPriorVotes(
        a1.address, t1.receipt.blockNumber
      ), '10000000000000000000000000');
      expectBignumberEqual(await eul.getPriorVotes(
        a1.address, t1.receipt.blockNumber + 1
      ), '10000000000000000000000000');
    });

    it('returns zero if < first checkpoint block', async () => {
      await mineBlock();
      const t1 = await eul.delegate(a1.address, {from: root.address});
      await mineBlock();
      await mineBlock();

      expectBignumberEqual(await eul.getPriorVotes(
        a1.address, t1.receipt.blockNumber - 1
      ), '0');
      expectBignumberEqual(await eul.getPriorVotes(
        a1.address, t1.receipt.blockNumber + 1
      ), '10000000000000000000000000');
    });

    it('generally returns the voting balance at the appropriate checkpoint', async () => {
      const t1 = await eul.delegate(a1.address, {from: root.address});
      await mineBlock();
      await mineBlock();
      const t2 = await eul.transfer(a2.address, 10, {from: root.address});
      await mineBlock();
      await mineBlock();
      const t3 = await eul.transfer(a2.address, 10, {from: root.address});
      await mineBlock();
      await mineBlock();
      const t4 = await eul.transfer(root.address, 20, {from: a2.address});
      await mineBlock();
      await mineBlock();

      expectBignumberEqual(
        await eul.getPriorVotes(a1.address, t1.receipt.blockNumber - 1),
        '0'
      );
      expectBignumberEqual(
        await eul.getPriorVotes(a1.address, t1.receipt.blockNumber),
        '10000000000000000000000000'
      );
      expectBignumberEqual(
        await eul.getPriorVotes(a1.address, t1.receipt.blockNumber + 1),
        '10000000000000000000000000'
      );
      expectBignumberEqual(
        await eul.getPriorVotes(a1.address, t2.receipt.blockNumber),
        '9999999999999999999999990'
      );
      expectBignumberEqual(
        await eul.getPriorVotes(a1.address, t2.receipt.blockNumber + 1),
        '9999999999999999999999990'
      );
      expectBignumberEqual(
        await eul.getPriorVotes(a1.address, t3.receipt.blockNumber),
        '9999999999999999999999980'
      );
      expectBignumberEqual(
        await eul.getPriorVotes(a1.address, t3.receipt.blockNumber + 1),
        '9999999999999999999999980'
      );
      expectBignumberEqual(
        await eul.getPriorVotes(a1.address, t4.receipt.blockNumber),
        '10000000000000000000000000'
      );
      expectBignumberEqual(await eul.getPriorVotes(
        a1.address, t4.receipt.blockNumber + 1
      ),
      '10000000000000000000000000');
    });
  });
});
 */