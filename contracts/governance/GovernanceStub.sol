// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";

contract GovernanceStub {

    event ProposalExecuted(string indexed description, bytes indexed proposalData);

    address public immutable governor;

    modifier onlyGovernor() {
        require(msg.sender == governor, "only governor can call");
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