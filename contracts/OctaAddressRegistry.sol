// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/interfaces/IERC165.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract OctaAddressRegistry is Ownable {
    bytes4 private constant INTERFACE_ID_ERC721 = 0x80ac58cd;

    /// @notice Octa contract
    address public octa;

    /// @notice OctaAuction contract
    address public auction;

    /// @notice OctaMarketplace contract
    address public marketplace;

    /// @notice OctaNFTFactory contract
    address public factory;

    /// @notice OctaTokenRegistry contract
    address public tokenRegistry;

    /**
     @notice Update octa contract
     @dev Only admin
     */
    function updateOcta(address _octa) external onlyOwner {
        require(
            IERC165(_octa).supportsInterface(INTERFACE_ID_ERC721),
            "Not ERC721"
        );
        octa = _octa;
    }

    /**
     @notice Update OctaAuction contract
     @dev Only admin
     */
    function updateAuction(address _auction) external onlyOwner {
        auction = _auction;
    }

    /**
     @notice Update OctaMarketplace contract
     @dev Only admin
     */
    function updateMarketplace(address _marketplace) external onlyOwner {
        marketplace = _marketplace;
    }

    /**
     @notice Update OctaNFTFactory contract
     @dev Only admin
     */
    function updateNFTFactory(address _factory) external onlyOwner {
        factory = _factory;
    }

    /**
     @notice Update token registry contract
     @dev Only admin
     */
    function updateTokenRegistry(address _tokenRegistry) external onlyOwner {
        tokenRegistry = _tokenRegistry;
    }
}
