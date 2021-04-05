const {findEventInTransaction} = require('../../helpers/events');

const getRaffleEndBlock = async raffleLength => {
  const currentBlock = await web3.eth.getBlockNumber();
  const endBlock = currentBlock + raffleLength;

  return endBlock;
};

const request = async (RNGInstance, commitSeed, raffleLength, opts) => {
  const {args} = await findEventInTransaction(
    RNGInstance.request(commitSeed, raffleLength, opts),
    'RequestAccepted'
  );

  return args;
};

module.exports = {
  request,
  getRaffleEndBlock
};
