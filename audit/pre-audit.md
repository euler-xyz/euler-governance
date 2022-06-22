# Pre-Audit notes for Governance Smart Contracts with Multi-token Support/Feature

Our Governance smart contracts are based exactly on the [OpenZeppelin Governance contracts (v4.6.0)](https://github.com/OpenZeppelin/openzeppelin-contracts/tree/master/contracts/governance). 

However, in the `multiple-tokens-array` branch we have added and tested some modifications to the `GovernorVotes` and `GovernorVotesQuorumFraction` smart contracts to support multiple sub tokens when computing voting power, e.g., as the [AAVE governance smart contracts](https://github.com/aave/governance-v2/blob/master/contracts/governance/GovernanceStrategy.sol) do by combining users voting power from both the `AAVE` and `stkAAVE` tokens during proposal creation and voting. 

While quorum computation is still based on the base/main token.
We have also covered the changes with additional tests to make sure all possible scenarios are covered, e.g., subset token list is only updateable through governance, empty array of subset tokens, voting power computation, voting power increase / decrease depending on tokens in subset array, deployment with only base token, base token not in subset token array, etc.

## Modified Smart Contracts 


### OpenZeppelin GovernorVotes => MultiGovernorVotes

The modifications made to the [OZ GovernorVotes](https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/governance/extensions/GovernorVotes.sol) smart contract to derive our [MultiGovernorVotes](https://github.com/euler-xyz/euler-governance/blob/multiple-tokens-array/contracts/governance/MultiGovernorVotes.sol) smart contract are described below.

* [L15 - L16](https://github.com/euler-xyz/euler-governance/blob/a059037d6ce91191a8896df1ea5055292f4aa017/contracts/governance/MultiGovernorVotes.sol#L15-L16) - We added an IVotes token array in line 16 and renamed token in line 15 to eul (representing the base governance token EUL from which token subsets will be derived, e.g., stEUL).

* [L18 - L25](https://github.com/euler-xyz/euler-governance/blob/a059037d6ce91191a8896df1ea5055292f4aa017/contracts/governance/MultiGovernorVotes.sol#L18-L25) - we modified the constructor of the contract to accept a second parameter which is the array of sub tokens. In the constructor logic, we perform zero address checks and ensure that none of the tokens in the sub token array is the base token to prevent doubling the voting power of EUL for users.

* [L35 - L41](https://github.com/euler-xyz/euler-governance/blob/a059037d6ce91191a8896df1ea5055292f4aa017/contracts/governance/MultiGovernorVotes.sol#L35-L41) - we have modified the only the logic of the internal `_getVotes()` function to return the sum of all voting powers of the sub tokens in the array plus voting power of EUL. If the sub tokens array is empty, only voting power of EUL is returned.

* [L44 - L50](https://github.com/euler-xyz/euler-governance/blob/a059037d6ce91191a8896df1ea5055292f4aa017/contracts/governance/MultiGovernorVotes.sol#L44-L50) - here we have added a setter for the sub tokens array and it can only be changed via a governance proposal, voting, and executing the successful proposal. It has some similarities with the constructor, however it can only be called via governance so it's not used within the constructor.

* [L52 - 54](https://github.com/euler-xyz/euler-governance/blob/a059037d6ce91191a8896df1ea5055292f4aa017/contracts/governance/MultiGovernorVotes.sol#L52-L54) - we have added a getter to return the present state of the sub tokens array.





### OpenZeppelin GovernorVotesQuorumFraction => MultiGovernorVotesQuorumFraction

The modifications made to the [OZ GovernorVotesQuorumFraction](https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/governance/extensions/GovernorVotesQuorumFraction.sol) smart contract to derive our [MultiGovernorVotesQuorumFraction](https://github.com/euler-xyz/euler-governance/blob/multiple-tokens-array/contracts/governance/MultiGovernorVotesQuorumFraction.sol) smart contract are described below.


* [L47 - L49](https://github.com/euler-xyz/euler-governance/blob/a059037d6ce91191a8896df1ea5055292f4aa017/contracts/governance/MultiGovernorVotesQuorumFraction.sol#L47-L49) - in this function, we have only changed token to eul so that it still uses the total supply of the base token when computing quorum. As other sub tokens will be derived, the logic does not need to loop over their total supply.