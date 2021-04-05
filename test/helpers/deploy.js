const EulerToken = artifacts.require('EulerToken');
const Governance = artifacts.require('Governance');
const TimeLock = artifacts.require('Timelock');
const TimeLockHarness = artifacts.require('TimelockHarness');

const { ethers } = require('ethers');
const { latest, duration, toBN } = require('../../helpers/utils');
const { getActorsAsync, getOwner } = require('../../helpers/address');
const { time } = require('@openzeppelin/test-helpers');

const { parseEther } = ethers.utils;

const deployEulerToken = async () => {
    const { owner } = await getActorsAsync();

    const eulerTokenInstance = await EulerToken.new(owner, { from: owner });

    return [eulerTokenInstance, { owner }];
};

const deployTimeLock = async (options = {}) => {
    const { owner } = await getActorsAsync();
    const {
        delay = duration.days(2)
    } = options;

    const timelockInstance = await TimeLock.new(owner, delay, { from: owner });

    return [timelockInstance, { owner }];
};

const deployTimeLockHarness = async (options = {}) => {
    const { owner } = await getActorsAsync();
    const {
        delay = duration.days(2)
    } = options;

    const timelockHarnessInstance = await TimeLockHarness.new(owner, delay, { from: owner });

    return [timelockHarnessInstance, { owner }];
};

const deployGovernance = async (options = {}) => {
    const { owner } = await getActorsAsync();

    const [timelockInstance] = await deployTimeLock();
    const [eulerTokenInstance] = await deployEulerToken();

    const {
        timelock = timelockInstance,
        eul = eulerTokenInstance
    } = options;

    const govInstance = await Governance.new(
        timelock.address,
        eul.address,
        owner,
        { from: owner }
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
    deployGovernance,
    deployTimeLock,
    deployTimeLockHarness
}