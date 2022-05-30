// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";

contract MockEulerGovernance {

    event ProposalExecuted(string description, bytes proposalData);

    address public immutable governor;

    modifier onlyGovernor() {
        require(msg.sender == governor, "GovernanceStub: only governor can call");
        _;
    }

    constructor(address _governor) {
        governor = _governor;
    }

    function executeProposal(
        string memory description, 
        bytes memory proposalData
    ) 
    external 
    onlyGovernor 
    {
        emit ProposalExecuted(description, proposalData);
    }
}