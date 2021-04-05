const MockBurpTokenV2 = artifacts.require('MockBurpTokenV2');
const RNG = artifacts.require('RNG');
const LinkToken = artifacts.require('LinkToken');
const VRFCoordinator = artifacts.require('VRFCoordinator');
const Raffle = artifacts.require('Raffle');
const MockTicket = artifacts.require('MockTicket');
const BurpToken = artifacts.require('BurpToken');
const NFTRarityRegister = artifacts.require('NFTRarityRegister');
const Staking = artifacts.require('Staking');
const MockERC20Token = artifacts.require('MockERC20Token');
const MockERC721Token = artifacts.require('MockERC721Token');

const {deployProxy} = require('@openzeppelin/truffle-upgrades');
const {ethers} = require('ethers');
const {latest, duration, toBN} = require('../../helpers/utils');
const {getRaffleActorsAsync, getStakeActorsAsync, getBurpTokenActorsAsync} = require('../../helpers/address');

const {parseEther} = ethers.utils;

const deployBurpToken = async (options = {}) => {
  const {
    name = 'Burp Test',
    symbol = 'BT',
    initialSupply = parseEther('100'),
    cap = parseEther('1000')
  } = options;

  const {
    owner,
    saleWallet,
    stakingWallet,
    reserveWallet,
    teamWallet,
    airdorpWallet
  } = await getBurpTokenActorsAsync();

  const burpToken = await deployProxy(BurpToken, [
    name,
    symbol,
    initialSupply,
    cap,
    saleWallet,
    stakingWallet,
    reserveWallet,
    teamWallet,
    airdorpWallet
  ],
  {initializer: 'initializeToken'});

  return [
    burpToken,
    {
      owner,
      saleWallet,
      stakingWallet,
      reserveWallet,
      teamWallet,
      airdorpWallet
    }
  ];
};

const deployMockNftToken = async () => {
  const {owner} = await getRaffleActorsAsync();
  const nftTokenInstance = await MockERC721Token.new('NFT Token', 'NFT', {from: owner});

  return [nftTokenInstance, {owner}];
};

const deployMockTicket = async () => {
  const {owner} = await getRaffleActorsAsync();
  const mockTicketInstance = await MockTicket.new('MockTicket', 'MKT', {from: owner});

  return [mockTicketInstance, {owner}];
};

const deployMockPrize = async () => {
  const {owner} = await getRaffleActorsAsync();
  const mockPrizeInstance = await MockTicket.new('MockPrize', 'PRZ', {from: owner});

  return [mockPrizeInstance, {owner}];
};

const deployLinkToken = async () => {
  const {owner} = await getRaffleActorsAsync();
  const deployLinkTokenInstance = await LinkToken.new({from: owner});

  return [deployLinkTokenInstance, {owner}];
};

const deployRarityRegister = async (options = {}) => {
  let {nftTokenInstance} = options;

  if (!nftTokenInstance) {
    [nftTokenInstance] = await deployMockNftToken();
  }

  const {owner} = await getRaffleActorsAsync();

  const RarityRegisterInstance = await NFTRarityRegister.new({from: owner});

  return [RarityRegisterInstance, {owner, nftTokenInstance}];
};

const deployMockERC20Token = async (options = {}) => {
  const {
    name = 'BURP',
    symbol = 'BRP'
  } = options;

  const {owner} = await getRaffleActorsAsync();
  const erc20TokenInstance = await MockERC20Token.new(name, symbol, {from: owner});

  return [erc20TokenInstance, {owner}];
};

const deployStaking = async (params = {}) => {
  const now = await latest();
  const {
    rewardsEndingTimestamp = toBN(now).add(duration.weeks(1)),
    currentAPYAnnualRate = '400'
  } = params;

  const [erc20TokenInstance] = await deployMockERC20Token();
  const [nftTokenInstance] = await deployMockNftToken();
  const [rarityRegisterInstance] = await deployRarityRegister();
  const [lotteryTicketInstance] = await deployMockNftToken();

  const {owner, rewardsWallet} = await getStakeActorsAsync();

  const stakeInstance = await Staking.new(
    erc20TokenInstance.address,
    rewardsWallet,
    lotteryTicketInstance.address,
    rarityRegisterInstance.address,
    rewardsEndingTimestamp,
    currentAPYAnnualRate,
    {from: owner}
  );

  await erc20TokenInstance.approve(stakeInstance.address, parseEther('100'));

  return [
    stakeInstance,
    {
      rewardsWallet,
      erc20TokenInstance,
      nftTokenInstance,
      rarityRegisterInstance
    }
  ];
};

const deployVRFCoordinator = async (options = {}) => {
  let {linkTokenInstance} = options;

  if (!linkTokenInstance) {
    [linkTokenInstance] = await deployLinkToken();
  }

  const {owner} = await getRaffleActorsAsync();

  const VRFCoordinatorInstance = await VRFCoordinator.new(linkTokenInstance.address, {from: owner});

  return [VRFCoordinatorInstance, {owner, linkTokenInstance}];
};

const deployRaffle = async () => {
  const [linkTokenInstance, {owner: mockLinkTokenOwner}] = await deployLinkToken();
  const {owner} = await getRaffleActorsAsync();
  const [raffleTicketInstance] = await deployMockTicket();
  const [VRFCoordinatorInstance] = await deployVRFCoordinator({linkTokenInstance});

  const raffleParams = [
    raffleTicketInstance.address,
    '0x6c3699283bda56ad74f6b855546325b68d482e983852a7a82979cc4807b641f4',
    VRFCoordinatorInstance.address,
    linkTokenInstance.address
  ];
  const raffleInstance = await Raffle.new(...raffleParams, {from: owner});

  const ownerBalance = await linkTokenInstance.balanceOf(mockLinkTokenOwner);
  await linkTokenInstance
    .transfer(raffleInstance.address, ownerBalance, {from: mockLinkTokenOwner});

  await raffleTicketInstance.setRaffleAddress(raffleInstance.address, {from: owner});

  return [
    raffleInstance,
    {
      raffleTicketInstance,
      owner,
      mockLinkTokenOwner,
      linkTokenInstance,
      VRFCoordinatorInstance
    }
  ];
};

const deployRNG = async () => {
  const {owner} = await getRaffleActorsAsync();
  const RNGInstance = await RNG.new({from: owner});

  return [RNGInstance, {owner}];
};
module.exports = {
  deployStaking,
  deployMockERC20Token,
  deployMockNftToken,
  deployRarityRegister,
  deployRaffle,
  deployRNG,
  deployMockTicket,
  deployMockPrize,
  deployBurpToken,
  MockBurpTokenV2
};
