// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract Euler is ERC20Votes, Ownable {

    constructor(string memory name, string memory symbol, uint256 totalSupply_) ERC20(name, symbol) ERC20Permit(name) {
        _mint(msg.sender, totalSupply_);
    }

    /**
     * Mints an amount of tokens to account. We can use AccessControl.sol here
     * to assign roles to pre-defined addresses. e.g., a minter role and a cap for minting
     * which will be used to validate the amount passed to the function in a modifier
     * We can also modify the AccessControl.sol contract with periodic minting allowances
     * e.g., bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
     * After deployment, we can call _setupRole(MINTER_ROLE, address); to grant minter role to account
     * and extend contract with minting restrictions where applicable.
     *
     * Being Ownable, exposes the transferOwnership and renounceOwnership functionalities.
     * renounceOwnership will set owner to address(0)
     */
    function mint(address account, uint256 amount) external onlyOwner {
        _mint(account, amount);
    }

    function getChainId() external view returns (uint256) {
        return block.chainid;
    }
}
