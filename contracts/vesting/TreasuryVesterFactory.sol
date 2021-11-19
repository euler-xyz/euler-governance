// function to 
//* deploy vesting contract using supplied params and 
//* transfer amount from self to new child contract
// map recipients to vesting contracts
// balanceOf vesting contract
// remove funds to treasury
// an address can have multiple vesting contracts tho
// so mapping(address => address[]) probably

// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "./TreasuryVester.sol";

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Address.sol";

// todo admin roles

contract TreasuryVesterFactory is AccessControl {
    using Address for address;

    /// @notice The role assigned to users who can call admin/restricted functions
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    /// @notice The Euler token
    IERC20 public euler;
    
    /// @notice The Euler treasury contract
    address public treasury;
    
    /// @notice mapping vested token recipients to their vesting contracts
    mapping(address => address[]) public vestingContracts;

    /// MODIFIERS
    modifier onlyAdmins() {
        require(
            hasRole(ADMIN_ROLE, msg.sender),
            "Caller does not have the ADMIN_ROLE"
        );
        _;
    }

    /// EVENTS
    event TreasuryUpdated(address newTreasury);
    event NewVestingContract(address indexed recipient, address vestingContract);

    constructor(address euler_, address treasury_) {
        require(euler_ != address(0));
        require(euler_.isContract());
        euler = IERC20(euler_);

        require(treasury_ != address(0));
        treasury = treasury_;

        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _setupRole(ADMIN_ROLE, msg.sender);
    }

    /**
    * @notice Creates a new vesting contract for the specified recipient. 
    * Only callable by admins.
    * @param recipient The address for which the vesting contract is created
    * @param vestingAmount The vested amount
    * @param vestingBegin The start timestamp of vesting
    * @param vestingCliff Timestamp of vesting cliff when withdrawal of vested tokens can begin
    * @param vestingEnd The timestamp when the vesting ends
    */
    function createVestingContract(
        address recipient,
        uint vestingAmount,
        uint vestingBegin,
        uint vestingCliff,
        uint vestingEnd
    ) external onlyAdmins {
        require(euler.balanceOf(address(this)) >= vestingAmount);
        TreasuryVester tv = new TreasuryVester(
            address(euler),
            recipient,
            vestingAmount,
            vestingBegin,
            vestingCliff,
            vestingEnd
        );
        vestingContracts[recipient].push(address(tv));
        emit NewVestingContract(recipient, address(tv));
    }

    /**
    * @notice Removes excess Euler tokens from this contract. 
    * Only callable by admins.
    * @param amount The amount to withdraw to treasury
    */
    function withdraw(uint256 amount) external onlyAdmins {
        euler.transfer(treasury, amount);
    }

    /**
    * @notice Update the treasury address to receive minted tokens. 
    * Only callable by admins.
    * @param newTreasury The address to set as the new Treasury
    */
    function updateTreasury(address newTreasury) external onlyAdmins {
        require(newTreasury != address(0), "cannot set zero treasury address");
        treasury = newTreasury;
        emit TreasuryUpdated(treasury);
    }
}