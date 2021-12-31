// SPDX-License-Identifier: MIT

pragma solidity ^0.8.4;

import "./TreasuryVester.sol";

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Address.sol";


contract TreasuryVesterFactory is AccessControl {
    using Address for address;

    /// @notice The role assigned to users who can call admin/restricted functions
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    /// @notice The Euler token
    IERC20 public EUL;
    
    /// @notice The Euler treasury contract
    address public treasury;
    
    /// @notice mapping vested token recipients to their vesting contracts
    mapping(address => address[]) public vestingContracts;

    /// MODIFIERS
    modifier onlyAdmin() {
        require(
            hasRole(ADMIN_ROLE, msg.sender),
            "Caller does not have the ADMIN_ROLE"
        );
        _;
    }

    /// EVENTS
    event TreasuryUpdated(address newTreasury);
    event VestingContract(address indexed recipient, address vestingContract, uint256 index);

    constructor(address eul_, address treasury_) {
        require(eul_ != address(0), "cannot set zero address as euler token");
        require(eul_.isContract(), "euler token must be a smart contract");
        EUL = IERC20(eul_);

        require(treasury_ != address(0), "cannot set zero address as treasuty");
        treasury = treasury_;

        _setupRole(DEFAULT_ADMIN_ROLE, treasury);
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
    ) external onlyAdmin returns (address recipient_, address vestingContract_, uint256 index_) {
        require(EUL.balanceOf(address(this)) >= vestingAmount, "insufficient balance for vestingAmount");
        TreasuryVester tv = new TreasuryVester(
            address(EUL),
            recipient,
            vestingAmount,
            vestingBegin,
            vestingCliff,
            vestingEnd
        );
        recipient_ = recipient;
        index_ = vestingContracts[recipient].length;
        vestingContract_ = address(tv);
        EUL.transfer(vestingContract_, vestingAmount);
        vestingContracts[recipient_].push(vestingContract_);
        emit VestingContract(recipient_, vestingContract_, index_);
    }

    /**
    * @notice Removes excess Euler tokens from this contract. 
    * Only callable by admins.
    * @param amount The amount to withdraw to treasury
    */
    function withdraw(uint256 amount) external onlyAdmin {
        EUL.transfer(treasury, amount);
    }

    /**
    * @notice Update the treasury address to receive minted tokens. 
    * Only callable by admins.
    * @param newTreasury The address to set as the new Treasury
    */
    function updateTreasury(address newTreasury) external onlyAdmin {
        require(newTreasury != address(0), "cannot set zero treasury address");
        treasury = newTreasury;
        emit TreasuryUpdated(treasury);
    }

    function getVestingContract(address recipient, uint256 index) external view returns (address) {
        return vestingContracts[recipient][index];
    }

    function getVestingContracts(address recipient) external view returns (address[] memory) {
        return vestingContracts[recipient];
    }

}