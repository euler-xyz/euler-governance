const PROPOSAL_STATES = {
  Pending: 0,
  Active: 1,
  Canceled: 2,
  Defeated: 3,
  Succeeded: 4,
  Queued: 5,
  Expired: 6,
  Executed: 7
};

const DEFAULT_GRACE_PERIOD = '604800'; // 1 week in seconds

module.exports = {
  PROPOSAL_STATES,
  DEFAULT_GRACE_PERIOD
};
