const {from, range} = require('rxjs');
const {concatMap, toArray} = require('rxjs/operators');
const {advanceBlockTo} = require('@openzeppelin/test-helpers/src/time');
const {deployMockPrize, deployRaffle} = require('./deploy');
const {getRaffleActorsAsync, getAccountsAsync} = require('../../helpers/address');
const {getRaffleEndBlock} = require('./rng');
const {findEventInTransaction} = require('../../helpers/events');
const {
  latest,
  duration,
  toBN,
  increaseTo,
  soliditySha3
} = require('../../helpers/utils');

const enterRaffle = async (
  raffleInstance,
  raffleIndex,
  raffleTicketInstance,
  playerAddresses = []
) => {
  const {owner} = await getRaffleActorsAsync();

  const mintAndPlayTicket = async (playerAddress, i) => {
    await raffleTicketInstance.mint(playerAddress, i, {from: owner});

    await raffleInstance.enterGame(
      raffleIndex,
      i,
      {from: playerAddress}
    );

    return [playerAddress, i];
  };

  return from(playerAddresses)
    .pipe(
      concatMap(mintAndPlayTicket),
      toArray()
    ).toPromise();
};

const populatePrizes = async (raffleInstance, raffleIndex, numberOfPrizes) => {
  const createPrize = async index => {
    const [mockPrizeInstance, {owner}] = await deployMockPrize();

    await mockPrizeInstance.mint(owner, index, {from: owner});
    await mockPrizeInstance.approve(raffleInstance.address, index, {from: owner});

    await raffleInstance.addPrize(
      raffleIndex,
      mockPrizeInstance.address,
      index,
      {from: owner}
    );

    // return instance, prize index and tokeId (equal to index in this case)
    return [mockPrizeInstance, index, index];
  };

  return await range(0, numberOfPrizes)
    .pipe(
      concatMap(createPrize),
      toArray()
    ).toPromise();
};

const deployRaffleWithPrizesAndOpenRaffle = async (options = {}) => {
  const {accounts = await getAccountsAsync()} = options;
  const [
    defaultRaffleInstance,
    {
      owner,
      raffleTicketInstance,
      VRFCoordinatorInstance
    }
  ] = await deployRaffle(accounts);

  const {
    forwardPastRaffleBlock = true,
    raffleLength = 10,
    raffleInstance = defaultRaffleInstance
  } = options;

  // eslint-disable-next-line max-len

  await populatePrizes(raffleInstance.address, 10);

  const targetBlock = await getRaffleEndBlock(raffleLength);
  await raffleInstance.startRaffle(targetBlock, {from: owner});

  if (forwardPastRaffleBlock) {
    await advanceBlockTo(targetBlock + 1);
  }

  return [
    raffleInstance,
    {
      raffleTicketInstance,
      owner,
      targetBlock,
      raffleLength,
      VRFCoordinatorInstance
    }
  ];
};

const startRaffle = async (raffleInstance, opt = {}) => {
  const {owner: defaultOwner} = await getRaffleActorsAsync();

  const now = await latest();

  const {
    owner = defaultOwner,
    startDate = toBN(now).add(duration.seconds(10)),
    endDate = toBN(now).add(duration.hours(1)),
    sendForward
  } = opt;

  const result = await raffleInstance.startRaffle(startDate, endDate, {from: owner});

  await increaseTo(startDate);

  if (sendForward) {
    await increaseTo(endDate);
  }

  const {args} = await findEventInTransaction(
    result,
    'RaffleStarted'
  );

  return [args.raffleIndex, {startDate, endDate}];
};

const startRaffleAndDraftWinners = async (raffleInstance, opt = {}) => {
  const defaultAccounts = await getAccountsAsync();
  const {owner: defaultOwner} = await getRaffleActorsAsync();

  const {
    prizesNumber = 3,
    raffleTicketInstance,
    playerAccounts = defaultAccounts.slice(1, 3),
    randomness = '123',
    VRFCoordinatorInstance,
    owner = defaultOwner,
    entropy = soliditySha3('entropy')
  } = opt;

  const [raffleIndex, {startDate, endDate}] = await startRaffle(raffleInstance);

  const players = await enterRaffle(
    raffleInstance,
    raffleIndex,
    raffleTicketInstance,
    playerAccounts
  );
  const prizes = await populatePrizes(raffleInstance, raffleIndex, prizesNumber);

  await increaseTo(endDate);

  const draftWinnersResult = await raffleInstance
    .draftWinners(raffleIndex, entropy, {from: owner});

  let requestId;
  // if Raffle has no Players, we don't make a Randomness Request
  if (playerAccounts.length > 0) {
    ({args: {requestId}} = await findEventInTransaction(
      draftWinnersResult,
      'RandomnessRequested'
    ));

    await VRFCoordinatorInstance.callBackWithRandomness(
      requestId,
      randomness,
      raffleInstance.address
    );
  }

  return {
    players,
    prizes,
    prizesNumber,
    raffleTicketInstance,
    playerAccounts,
    randomness,
    VRFCoordinatorInstance,
    owner,
    entropy,
    raffleIndex,
    requestId,
    startDate,
    endDate
  };
};

const calculateWinnerIndex = (index, entropy, playersLength) => {
  const dividend = toBN(soliditySha3(entropy.add(toBN(index))));

  return dividend.mod(playersLength);
};

module.exports = {
  populatePrizes,
  enterRaffle,
  deployRaffleWithPrizesAndOpenRaffle,
  startRaffle,
  startRaffleAndDraftWinners,
  calculateWinnerIndex
};
