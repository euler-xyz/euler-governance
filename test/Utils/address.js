const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

const getOwner = accounts => accounts[0];

const getUserAddress = (accounts, i) => {
  if (i < 1 || i > 5) throw Error('Index must be between 1 and 5');
  return accounts[5 + i];
};

const getActors = accounts => ({
  owner: getOwner(accounts),
  user: getUserAddress(accounts, 1)
});

const getBurpTokenActors = accounts => ({
  owner: getOwner(accounts),
  saleWallet: getUserAddress(accounts, 1),
  stakingWallet: getUserAddress(accounts, 2),
  reserveWallet: getUserAddress(accounts, 3),
  teamWallet: getUserAddress(accounts, 4),
  airdorpWallet: getUserAddress(accounts, 5)
});

module.exports = {
  ZERO_ADDRESS,
  getUserAddress,
  getOwner,
  getActors,
  getBurpTokenActors
};
