// SPDX-License-Identifier: MIT

pragma solidity ^0.8.4;

import "@openzeppelin/contracts/proxy/utils/Initializable.sol";

contract TreasuryVester is Initializable {
    address public eul;
    address public recipient;

    uint public vestingAmount;
    uint public vestingBegin;
    uint public vestingCliff;
    uint public vestingEnd;

    uint public lastUpdate;

    function initialize(
        address eul_,
        address recipient_,
        uint vestingAmount_,
        uint vestingBegin_,
        uint vestingCliff_,
        uint vestingEnd_
    ) public initializer {
        require(eul_ != address(0), 'TreasuryVester::constructor: invalid EUL token contract address');
        require(recipient_ != address(0), 'TreasuryVester::constructor: invalid recipient address');
        require(vestingCliff_ >= vestingBegin_, 'TreasuryVester::constructor: cliff is too early');
        require(vestingEnd_ > vestingCliff_, 'TreasuryVester::constructor: end is too early');

        eul = eul_;
        recipient = recipient_;
        
        vestingAmount = vestingAmount_;
        vestingBegin = vestingBegin_;
        vestingCliff = vestingCliff_;
        vestingEnd = vestingEnd_;

        lastUpdate = vestingBegin_;
    }

    function setRecipient(address recipient_) public {
        require(msg.sender == recipient, 'TreasuryVester::setRecipient: unauthorized');
        recipient = recipient_;
    }

    function claim() public {
        require(block.timestamp >= vestingCliff, 'TreasuryVester::claim: not time yet');
        uint amount;
        if (block.timestamp >= vestingEnd) {
            amount = IERC20Votes(eul).balanceOf(address(this));
        } else {
            amount = vestingAmount * (block.timestamp - lastUpdate) / (vestingEnd - vestingBegin);
            lastUpdate = block.timestamp;
        }
        IERC20Votes(eul).transfer(recipient, amount);
    }

    /**
     * @notice Delegates the vested tokens to a delegate address to be used for governance.
     * Only callable by the recipient.
     * @param delegatee_ The address to serve as the delegate
     */
    function delegate(address delegatee_) public {
        require(msg.sender == recipient, 'TreasuryVester::delegate: unauthorized');
        IERC20Votes(eul).delegate(delegatee_);
    }
}

interface IERC20Votes {
    function delegate(address delegatee) external;
    function balanceOf(address account) external view returns (uint);
    function transfer(address dst, uint rawAmount) external returns (bool);
}