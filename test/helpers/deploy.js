const EUL = artifacts.require('EUL');
const Governance = artifacts.require('Governance');
const TimeLock = artifacts.require('TimeLock');
const TimeLockHarness = artifacts.require('TimeLockHarness');

const {ethers} = require('ethers');
const {latest, duration, toBN} = require('../../helpers/utils');
const {getActorsAsync, getOwner} = require('../../helpers/address');

const {parseEther} = ethers.utils;

const deployEulerToken = async (options = {}) => {
  const {
    owner = getOwner()
  } = options;
  
  const eulerTokenInstance = await EUL.new(owner, {from: owner});

  return [eulerTokenInstance, {owner}];
};

const deployTimeLock = async (options = {}) => {
  const {
    owner = getOwner(),
    delay = duration.days(2)
  } = options;

  const timelockInstance = await TimeLock.new(owner, delay, {from: owner});

  return [timelockInstance, {owner}];
};

const deployGovernance = async (params = {}) => {
  const {
    owner = getOwner()
  } = options;

  const [timelockInstance] = await deployTimeLock();
  const [eulerTokenInstance] = await deployMockNftToken();
  
  const govInstance = await Governance.new(
    eulerTokenInstance.address,
    timelockInstance.address,
    owner,
    {from: owner}
  );

  return [
    govInstance,
    {
      owner,
      timelockInstance,
      eulerTokenInstance
    }
  ];
};


module.exports = {
  deployEulerToken,
  deployTimeLock,
  deployGovernance
};
