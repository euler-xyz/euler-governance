// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract Euler is ERC20Votes, Ownable {
    constructor(string memory name, string memory symbol, uint256 totalSupply_) ERC20(name, symbol) ERC20Permit(name) {
        _mint(msg.sender, totalSupply_);
    }

    function mint(address account, uint256 amount) external onlyOwner {
        _mint(account, amount);
    }

    function getChainId() external view returns (uint256) {
        return block.chainid;
    }
}
