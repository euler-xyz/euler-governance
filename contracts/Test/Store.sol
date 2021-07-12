//SPDX-License-Identifier: Unlicensed
pragma solidity ^0.7.0;

contract Store {

    uint public num;
    address public admin;

    event NewNumber(uint256 num);

    constructor(address _admin) {
        require(_admin != address(0), "invalid address");
        admin = _admin;
    }

    function setNum(uint256 number) external {
        require(number > 0, "invalid number");
        require(msg.sender == admin, "invalid caller");
        num = number;
        emit NewNumber(num);
    }

    function paySetNum(uint256 number) external payable {
        require(msg.value == 1 ether, "invalid amount paid");
        require(number > 0, "invalid number");
        require(msg.sender == admin, "invalid caller");
        num = number;
        emit NewNumber(num);
    }

    function getNum() public view returns (uint256) {
        return num;
    }

}