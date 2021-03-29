// const {promisify} = require('util');

const BigNumber = require('bignumber.js');
const ethers = require('ethers');

async function rpc(request) {
  return new Promise((okay, fail) => web3.currentProvider.send(
    request, (err, res) => (err ? fail(err) : okay(res))
  ));
}

function UInt256Max() {
  return ethers.constants.MaxUint256;
}

function address(n) {
  return `0x${n.toString(16).padStart(40, '0')}`;
}

async function etherBalance(addr) {
  return new BigNumber(await web3.eth.getBalance(addr));
}

async function etherGasCost(receipt) {
  const tx = await web3.eth.getTransaction(receipt.transactionHash);
  const gasUsed = new BigNumber(receipt.gasUsed);
  const gasPrice = new BigNumber(tx.gasPrice);
  return gasUsed.times(gasPrice);
}

function etherUnsigned(num) {
  return new BigNumber(num);
}

function keccak256(values) {
  return ethers.utils.keccak256(values);
}

async function mineBlockNumber(n) {
  return rpc({method: 'evm_mineBlockNumber', params: [n]});
}

async function mineBlock() {
  return rpc({method: 'evm_mine'});
}

async function increaseTime(seconds) {
  await rpc({method: 'evm_increaseTime', params: [seconds]});
  return rpc({method: 'evm_mine'});
}

async function setTime(seconds) {
  await rpc({method: 'evm_setTime', params: [new Date(seconds * 1000)]});
}

async function freezeTime(seconds) {
  await rpc({method: 'evm_freezeTime', params: [seconds]});
  return rpc({method: 'evm_mine'});
}

async function minerStart() {
  return rpc({method: 'miner_start'});
}

async function minerStop() {
  return rpc({method: 'miner_stop'});
}

function sign(data, account) {
  const signature = web3.eth.sign(data, account);
  return signature;
}

module.exports = {
  sign,
  address,
  etherBalance,
  etherGasCost,
  etherUnsigned,
  keccak256,
  freezeTime,
  increaseTime,
  mineBlock,
  mineBlockNumber,
  minerStart,
  minerStop,
  rpc,
  setTime,
  UInt256Max
};
