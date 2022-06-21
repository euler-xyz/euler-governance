// SPDX-License-Identifier: MIT
// OpenZeppelin Contracts (last updated v4.6.0) (governance/extensions/GovernorVotes.sol)

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/governance/Governor.sol";
import "@openzeppelin/contracts/governance/utils/IVotes.sol";

/**
 * @dev Extension of {Governor} for voting weight extraction from an {ERC20Votes} token, or since v4.5 an {ERC721Votes} token.
 *
 * _Available since v4.3._
 */
abstract contract MultiGovernorVotes is Governor {
    IVotes public immutable eul;
    IVotes[] public tokens;

    constructor(IVotes EUL, IVotes[] memory tokenAddresses) {
        for (uint i = 0; i<tokenAddresses.length; i++) {
            require(address(tokenAddresses[i]) != address(0), "Governor: cannot set zero address");
            require(address(tokenAddresses[i]) != address(EUL), "Governor: cannot set eul in subset list");
        }
        tokens = tokenAddresses;
        eul = EUL;
    }

    /**
     * Read the voting weight from the token's built in snapshot mechanism (see {Governor-_getVotes}).
     */
    function _getVotes(
        address account,
        uint256 blockNumber,
        bytes memory /*params*/
    ) internal view virtual override returns (uint256) {
        uint256 totalVotes = 0;
        if (tokens.length > 0) {
            for (uint i = 0; i < tokens.length; i++) {
                totalVotes += tokens[i].getPastVotes(account, blockNumber);
            }
        }
        return totalVotes + eul.getPastVotes(account, blockNumber);
    }

    function setSupportedTokens(IVotes[] memory tokenAddresses) external virtual onlyGovernance {
        for (uint i = 0; i<tokenAddresses.length; i++) {
            require(address(tokenAddresses[i]) != address(0), "Governor: cannot set zero address");
            require(address(tokenAddresses[i]) != address(eul), "Governor: cannot set eul in subset list");
        }
        tokens = tokenAddresses;
    }

    function getSupportedTokens() external view virtual returns(IVotes[] memory) {
        return tokens;
    }
}
