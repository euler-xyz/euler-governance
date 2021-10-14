// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract TestTokenAccessControl is ERC20Votes, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    modifier onlyMinters() {
        require(
            hasRole(MINTER_ROLE, _msgSender()),
            "Caller does not have the MINTER_ROLE"
        );
        _;
    }

    constructor(
        string memory name, 
        string memory symbol, 
        uint256 totalSupply_,
        address minter
    ) 
        ERC20(name, symbol) 
        ERC20Permit(name) 
    {
        _mint(_msgSender(), totalSupply_);
        _setupRole(MINTER_ROLE, minter);
        _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
    }

    function mint(address to, uint256 amount) public onlyMinters {
        _mint(to, amount);
    }

    function getChainId() external view returns (uint256) {
        return block.chainid;
    }
}
