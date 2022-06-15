// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/governance/extensions/GovernorSettings.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorTimelockControl.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorCountingSimple.sol";
// import "@openzeppelin/contracts/governance/extensions/GovernorVotesQuorumFraction.sol";
import "./MultiGovernorVotesQuorumFraction.sol";

import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";

contract Governance is 
GovernorSettings, 
GovernorTimelockControl, 
GovernorCountingSimple,
MultiGovernorVotesQuorumFraction
{
    constructor(
        string memory name_,
        ERC20Votes eul_,
        ERC20Votes stEul_,
        uint256 votingDelay_,
        uint256 votingPeriod_,
        TimelockController timelock_,
        uint256 quorumNumerator_,
        uint256 proposalThreshold_
    )
        Governor(name_)
        GovernorTimelockControl(timelock_)
        MultiGovernorVotes(eul_, stEul_)
        MultiGovernorVotesQuorumFraction(quorumNumerator_)
        GovernorSettings(votingDelay_, votingPeriod_, proposalThreshold_)
    {}

    function supportsInterface(bytes4 interfaceId)
        public
        view
        virtual
        override(Governor, GovernorTimelockControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    function quorum(uint256 blockNumber)
        public
        view
        override(IGovernor, MultiGovernorVotesQuorumFraction)
        returns (uint256)
    {
        return super.quorum(blockNumber);
    }

    /**
     * Overriden functions
     */

    function proposalThreshold() public view virtual override(Governor, GovernorSettings) returns (uint256) {
        return super.proposalThreshold();
    }

    function propose(
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        string memory description
    ) public virtual override(IGovernor, Governor) returns (uint256) {
        return super.propose(targets, values, calldatas, description);
    }

    function state(uint256 proposalId)
        public
        view
        virtual
        override(Governor, GovernorTimelockControl)
        returns (ProposalState)
    {
        return super.state(proposalId);
    }

    function _execute(
        uint256 proposalId,
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        bytes32 descriptionHash
    ) internal virtual override(Governor, GovernorTimelockControl) {
        super._execute(proposalId, targets, values, calldatas, descriptionHash);
    }

    function _cancel(
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        bytes32 descriptionHash
    ) internal virtual override(Governor, GovernorTimelockControl) returns (uint256 proposalId) {
        return super._cancel(targets, values, calldatas, descriptionHash);
    }
    
    function _executor() internal view virtual override(Governor, GovernorTimelockControl) returns (address) {
        return super._executor();
    }
}
