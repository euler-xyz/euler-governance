// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";

contract TestToken is ERC20Votes {
    constructor(string memory name, string memory symbol, uint256 totalSupply_) ERC20(name, symbol) ERC20Permit(name) {
        _mint(msg.sender, totalSupply_);
    }

    function getChainId() external view returns (uint256) {
        return block.chainid;
    }
}
