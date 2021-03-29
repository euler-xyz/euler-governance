const {ethers} = require('hardhat'); // {upgrades}
const {
  BN, // Big Number support
  time,
  // constants, // Common constants, like the zero address and largest integers
  // expectEvent, // Assertions for emitted events
  expectRevert // Assertions for transactions that should fail
} = require('@openzeppelin/test-helpers');
const web3 = require('web3');

const expectVMException = expectRevert.unspecified;
const expectInvalidOpCode = expectRevert.invalidOpcode;
const shouldFailWithMessage = expectRevert;

const {advanceBlockTo, advanceBlock} = time;
const increaseTime = time.increase;
const toBN = value => new BN(value);
const {parseEther, formatEther} = ethers.utils;
const toHex = value => web3.utils.toHex(value);
const hexToBytes = hex => web3.utils.hexToBytes(hex);
const hexToUtf8 = hex => web3.utils.hexToUtf8(hex);
const bytesToHex = bytes => web3.utils.bytesToHex(bytes);
const padLeft = (str, charAmount) => web3.utils.padLeft(str, charAmount);
const padRight = (str, charAmount) => web3.utils.padRight(str, charAmount);
const {soliditySha3} = web3.utils;
// const {encodeFunctionSignature} = web3.eth.abi;
const asciiToHex = str => web3.utils.asciiToHex(str);
const encodeBytes32Param = str => asciiToHex(str);
const stringToBytes32 = str => web3.utils.fromAscii(str);
const bytes32ToString = bytes => web3.utils.toAscii(bytes);

module.exports = {
  expectVMException,
  expectInvalidOpCode,
  shouldFailWithMessage,
  toHex,
  hexToBytes,
  hexToUtf8,
  bytesToHex,
  padLeft,
  padRight,
  soliditySha3,
  // mencodeFunctionSignature,
  encodeBytes32Param,
  stringToBytes32,
  bytes32ToString,
  parseEther,
  formatEther,
  // upgradeProxy,
  // deployProxy,
  advanceBlockTo,
  advanceBlock,
  increaseTime,
  toBN
};
