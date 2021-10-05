// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract OctaNFT is ERC721, ERC721Enumerable, ERC721URIStorage, Ownable {
    using Counters for Counters.Counter;

    /// @dev Events of the contract
    event Minted(
        uint256 tokenId,
        address beneficiary,
        string tokenUri,
        address minter
    );
    event UpdatePlatformFee(uint256 platformFee);
    event UpdateFeeRecipient(address payable feeRecipient);

    address auction;
    address marketplace;
    Counters.Counter private _tokenIds;
    /// @notice Platform fee
    uint256 public platformFee;

    /// @notice Platform fee receipient
    address payable public feeReceipient;

    /// @notice Contract constructor
    constructor(
        string memory _name,
        string memory _symbol,
        address _auction,
        address _marketplace,
        uint256 _platformFee,
        address payable _feeReceipient
    ) public ERC721(_name, _symbol) {
        auction = _auction;
        marketplace = _marketplace;
        platformFee = _platformFee;
        feeReceipient = _feeReceipient;
    }

    /**
     @notice Method for updating platform fee
     @dev Only admin
     @param _platformFee uint256 the platform fee to set
     */
    function updatePlatformFee(uint256 _platformFee) external onlyOwner {
        platformFee = _platformFee;
        emit UpdatePlatformFee(_platformFee);
    }

    /**
     @notice Method for updating platform fee address
     @dev Only admin
     @param _feeReceipient payable address the address to sends the funds to
     */
    function updateFeeRecipient(address payable _feeReceipient)
        external
        onlyOwner
    {
        feeReceipient = _feeReceipient;
        emit UpdateFeeRecipient(_feeReceipient);
    }

    /**
     * @dev Mints a token to an address with a tokenURI.
     * @param _to address of the future owner of the token
     */
    function mint(address _to, string calldata _tokenUri) external payable {
        require(msg.value >= platformFee, "Insufficient funds to mint.");

        _tokenIds.increment();
        uint256 newTokenId = _tokenIds.current();

        _safeMint(_to, newTokenId);
        _setTokenURI(newTokenId, _tokenUri);

        // Send OCTA fee to fee recipient
        (bool success, ) = feeReceipient.call{value: msg.value}("");
        require(success, "Transfer failed");

        emit Minted(newTokenId, _to, _tokenUri, _msgSender());
    }

    /**
    @notice Burns a DigitalaxGarmentNFT, releasing any composed 1155 tokens held by the token itself
    @dev Only the owner or an approved sender can call this method
    @param _tokenId the token ID to burn
    */
    function burn(uint256 _tokenId) external {
        address operator = _msgSender();
        require(
            ownerOf(_tokenId) == operator || isApproved(_tokenId, operator),
            "Only garment owner or approved"
        );

        // Destroy token mappings
        _burn(_tokenId);
    }

    /**
     * @dev checks the given token ID is approved either for all or the single token ID
     */
    function isApproved(uint256 _tokenId, address _operator)
        public
        view
        returns (bool)
    {
        return
            isApprovedForAll(ownerOf(_tokenId), _operator) ||
            getApproved(_tokenId) == _operator;
    }

    /**
     * Override isApprovedForAll to whitelist Octa contracts to enable gas-less listings.
     */
    function isApprovedForAll(address owner, address operator)
        public
        view
        override
        returns (bool)
    {
        // Whitelist Octa auction, marketplace contracts for easy trading.
        if (auction == operator || marketplace == operator) {
            return true;
        }

        return super.isApprovedForAll(owner, operator);
    }

    /**
     * Override _isApprovedOrOwner to whitelist Octa contracts to enable gas-less listings.
     */
    function _isApprovedOrOwner(address spender, uint256 tokenId)
        internal
        view
        override
        returns (bool)
    {
        require(
            _exists(tokenId),
            "ERC721: operator query for nonexistent token"
        );
        address owner = ERC721.ownerOf(tokenId);
        if (isApprovedForAll(owner, spender)) return true;
        return super._isApprovedOrOwner(spender, tokenId);
    }

    // The following functions are overrides required by Solidity.

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId
    ) internal override(ERC721, ERC721Enumerable) {
        super._beforeTokenTransfer(from, to, tokenId);
    }

    function _burn(uint256 tokenId)
        internal
        override(ERC721, ERC721URIStorage)
    {
        super._burn(tokenId);
    }

    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721Enumerable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
