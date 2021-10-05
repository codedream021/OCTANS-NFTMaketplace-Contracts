const {
  expectEvent,
  BN,
  ether,
  constants,
} = require("@openzeppelin/test-helpers");

const { expect } = require("chai");

const OctaAddressRegistry = artifacts.require("OctaAddressRegistry");
const OctaAuction = artifacts.require("MockOctaAuction");
const OctaMarketplace = artifacts.require("OctaMarketplace");

const OctaNFTFactory = artifacts.require("OctaNFTFactory");
const OctaNFT = artifacts.require("OctaNFT");
const OctaTokenRegistry = artifacts.require("OctaTokenRegistry");
const MockERC20 = artifacts.require("MockERC20");

const PLATFORM_FEE = "2";
const MARKETPLACE_PLATFORM_FEE = "50"; // 5%
const MINT_FEE = "1";

const weiToEther = (n) => {
  return web3.utils.fromWei(n.toString(), "ether");
};

contract(
  "Overall Test",
  function ([
    owner,
    platformFeeRecipient,
    artist,
    buyer,
    bidder1,
    bidder2,
    bidder3,
  ]) {
    const platformFee = ether(PLATFORM_FEE);
    const marketPlatformFee = new BN(MARKETPLACE_PLATFORM_FEE);
    const mintFee = ether(MINT_FEE);

    beforeEach(async function () {
      this.OctaAddressRegistry = await OctaAddressRegistry.new();

      this.octaAuction = await OctaAuction.new();
      await this.octaAuction.initialize(platformFeeRecipient);
      await this.octaAuction.updateAddressRegistry(
        this.OctaAddressRegistry.address
      );

      this.octaMarketplace = await OctaMarketplace.new();
      await this.octaMarketplace.initialize(
        platformFeeRecipient,
        marketPlatformFee
      );
      await this.octaMarketplace.updateAddressRegistry(
        this.OctaAddressRegistry.address
      );

      this.OctaNFTFactory = await OctaNFTFactory.new(
        this.octaAuction.address,
        this.octaMarketplace.address,
        mintFee,
        platformFeeRecipient,
        platformFee
      );
      this.OctaTokenRegistry = await OctaTokenRegistry.new();

      this.mockERC20 = await MockERC20.new("OCT", "OCT", ether("1000000"));
      this.octa = await OctaNFT.new(
        "OctaNFT",
        "OCT",
        this.octaAuction.address,
        this.octaMarketplace.address,
        platformFee,
        platformFeeRecipient
      );

      this.OctaTokenRegistry.add(this.mockERC20.address);

      await this.OctaAddressRegistry.updateOcta(this.octa.address);
      await this.OctaAddressRegistry.updateAuction(this.octaAuction.address);
      await this.OctaAddressRegistry.updateMarketplace(
        this.octaMarketplace.address
      );

      await this.OctaAddressRegistry.updateNFTFactory(
        this.OctaNFTFactory.address
      );
      await this.OctaAddressRegistry.updateTokenRegistry(
        this.OctaTokenRegistry.address
      );
    });

    describe("Minting and auctioning NFT", function () {
      it("Scenario 1", async function () {
        console.log(`
            Scenario 1:
            An artist mints an NFT for him/herself
            He/She then put it on the marketplace with price of 20 OCTs
            A buyer then buys that NFT with ERC20
            `);

        let balance = await this.octa.platformFee();
        console.log(`
            Platform Fee: ${weiToEther(balance)}`);

        const balance1 = await web3.eth.getBalance(artist);
        console.log(`
            ETH balance of artist before minting: ${weiToEther(balance1)}`);

        const balance2 = await web3.eth.getBalance(platformFeeRecipient);
        console.log(`
            ETH balance of the fee recipient before minting: ${weiToEther(
              balance2
            )}`);

        console.log(`
            Now minting...`);
        let result = await this.octa.mint(
          artist,
          "http://artist.com/art.jpeg",
          { from: artist, value: ether(PLATFORM_FEE) }
        );
        console.log(`
            Minted successfully`);

        const balance3 = await web3.eth.getBalance(artist);
        console.log(`
            ETH balance of artist after minting: ${weiToEther(balance3)}`);

        const balance4 = await web3.eth.getBalance(platformFeeRecipient);
        console.log(`
            ETH balance of recipient after minting: ${weiToEther(balance4)}`);

        console.log(`
            *The difference of the artist's ETH balance should be more than ${PLATFORM_FEE} ETH as 
            the platform fee is ${PLATFORM_FEE} ETH and minting costs some gases
            but should be less than ${
              Number(PLATFORM_FEE) + 1
            } ETH as the gas fees shouldn't be more than 1 ETH`);
        expect(
          weiToEther(balance1) * 1 - weiToEther(balance3) * 1
        ).to.be.greaterThan(PLATFORM_FEE * 1);
        expect(
          weiToEther(balance1) * 1 - weiToEther(balance3) * 1
        ).to.be.lessThan(PLATFORM_FEE * 1 + 1);

        console.log(`
            *The difference of the recipients's ETH balance should be ${PLATFORM_FEE} ETH as the platform fee is ${PLATFORM_FEE} ETH `);
        expect(weiToEther(balance4) * 1 - weiToEther(balance2) * 1).to.be.equal(
          PLATFORM_FEE * 1
        );

        console.log(`
            *Event Minted should be emitted with correct values: 
            tokenId = 1, 
            beneficiary = ${artist}, 
            tokenUri = ${"http://artist.com/art.jpeg"},
            minter = ${artist}`);
        expectEvent(result, "Minted", {
          tokenId: new BN("1"),
          beneficiary: artist,
          tokenUri: "http://artist.com/art.jpeg",
          minter: artist,
        });

        console.log(`
            The artist approves the nft to the market`);
        await this.octa.setApprovalForAll(this.octaMarketplace.address, true, {
          from: artist,
        });

        console.log(`
            The artist lists the nft in the market with price 20 OCT and starting time 2021-09-22 10:00:00 GMT`);
        await this.octaMarketplace.listItem(
          this.octa.address,
          new BN("1"),
          new BN("1"),
          this.mockERC20.address,
          ether("20"),
          new BN("1632304800"), // 2021-09-22 10:00:00 GMT
          { from: artist }
        );

        let listing = await this.octaMarketplace.listings(
          this.octa.address,
          new BN("1"),
          artist
        );
        console.log(`
            *The nft should be on the marketplace listing`);
        expect(listing.quantity.toString()).to.be.equal("1");
        expect(listing.payToken).to.be.equal(this.mockERC20.address);
        expect(weiToEther(listing.pricePerItem) * 1).to.be.equal(20);
        expect(listing.startingTime.toString()).to.be.equal("1632304800");

        console.log(`
            Mint 50 OCTs to buyer so he can buy the nft`);
        await this.mockERC20.mint(buyer, ether("50"));

        console.log(`
            Buyer approves OctaMarketplace to transfer up to 50 OCT`);
        await this.mockERC20.approve(
          this.octaMarketplace.address,
          ether("50"),
          { from: buyer }
        );

        console.log(`
            Buyer buys the nft for 20 OCTs`);
        result = await this.octaMarketplace.buyItemWithERC20(
          // function overloading doesn't work
          this.octa.address,
          new BN("1"),
          this.mockERC20.address,
          artist,
          { from: buyer }
        );

        console.log(`
            *Event ItemSold should be emitted with correct values: 
            seller = ${artist}, 
            buyer = ${buyer}, 
            nft = ${this.octa.address},
            tokenId = 1,
            quantity =1,
            payToken = ${this.mockERC20.address},
            unitPrice = 20,
            pricePerItem = 20`);
        expectEvent(result, "ItemSold", {
          seller: artist,
          buyer: buyer,
          nft: this.octa.address,
          tokenId: new BN("1"),
          quantity: new BN("1"),
          payToken: this.mockERC20.address,
          pricePerItem: ether("20"),
        });

        balance = await this.mockERC20.balanceOf(buyer);
        console.log(`
            *The OCT balance of buyer now should be 30 OCTs`);
        expect(weiToEther(balance) * 1).to.be.equal(30);

        const nftOwner = await this.octa.ownerOf(new BN("1"));
        console.log(`
            The owner of the nft now should be the buyer`);
        expect(nftOwner).to.be.equal(buyer);

        balance = await this.mockERC20.balanceOf(artist);
        console.log(`
            *The OCT balance of the artist should be 19 OCTs`);
        expect(weiToEther(balance) * 1).to.be.equal(19);

        balance = await this.mockERC20.balanceOf(platformFeeRecipient);
        console.log(`
            *The OCT balance of the recipient should be 1 OCT`);
        expect(weiToEther(balance) * 1).to.be.equal(1);

        listing = await this.octaMarketplace.listings(
          this.octa.address,
          new BN("1"),
          artist
        );
        console.log(`
            *The nft now should be removed from the listing`);
        expect(listing.quantity.toString()).to.be.equal("0");
        expect(listing.payToken).to.be.equal(constants.ZERO_ADDRESS);
        expect(weiToEther(listing.pricePerItem) * 1).to.be.equal(0);
        expect(listing.startingTime.toString()).to.be.equal("0");

        console.log("");
      });

      it("Scenario 2", async function () {
        console.log(`
        Scenario 2:
        An artist mints an NFT for him/herself
        He/She then put it on the marketplace with price of 20 OCTs
        A buyer then buys that NFT with Ethereum
        `);

        const balance = await this.octa.platformFee();
        console.log(`
        Platform Fee: ${weiToEther(balance)}`);

        let balance1 = await web3.eth.getBalance(artist);
        console.log(`
        ETH balance of artist before minting: ${weiToEther(balance1)}`);

        let balance2 = await web3.eth.getBalance(platformFeeRecipient);
        console.log(`
        ETH balance of the fee recipient before minting: ${weiToEther(
          balance2
        )}`);

        console.log(`
        Now minting...`);
        let result = await this.octa.mint(
          artist,
          "http://artist.com/art2.jpeg",
          { from: artist, value: ether(PLATFORM_FEE) }
        );
        console.log(`
        Minted successfully`);

        let balance3 = await web3.eth.getBalance(artist);
        console.log(`
        ETH balance of artist after minting: ${weiToEther(balance3)}`);

        let balance4 = await web3.eth.getBalance(platformFeeRecipient);
        console.log(`
        ETH balance of recipient after minting: ${weiToEther(balance4)}`);

        console.log(`
        *The difference of the artist's ETH balance should be more than ${PLATFORM_FEE} ETH as 
        the platform fee is ${PLATFORM_FEE} ETH and minting costs some gases`);
        expect(
          weiToEther(balance1) * 1 - weiToEther(balance3) * 1
        ).to.be.greaterThan(PLATFORM_FEE * 1);

        console.log(`
        *The difference of the recipients's ETH balance should be ${PLATFORM_FEE} ETH as the platform fee is ${PLATFORM_FEE} ETH `);
        expect(weiToEther(balance4) * 1 - weiToEther(balance2) * 1).to.be.equal(
          PLATFORM_FEE * 1
        );

        console.log(`
        *Event Minted should be emitted with correct values: 
        tokenId = 1, 
        beneficiary = ${artist}, 
        tokenUri = ${"http://artist.com/art2.jpeg"},
        minter = ${artist}`);
        expectEvent(result, "Minted", {
          tokenId: new BN("1"),
          beneficiary: artist,
          tokenUri: "http://artist.com/art2.jpeg",
          minter: artist,
        });

        console.log(`
        The artist approves the nft to the market`);
        await this.octa.setApprovalForAll(this.octaMarketplace.address, true, {
          from: artist,
        });

        console.log(`
        The artist lists the nft in the market with price 20 ETH and starting time 2021-09-22 10:00:00 GMT`);
        await this.octaMarketplace.listItem(
          this.octa.address,
          new BN("1"),
          new BN("1"),
          constants.ZERO_ADDRESS,
          ether("20"),
          new BN("1632304800"), // 2021-09-22 10:00:00 GMT
          { from: artist }
        );

        let listing = await this.octaMarketplace.listings(
          this.octa.address,
          new BN("1"),
          artist
        );
        console.log(`
        *The nft should be on the marketplace listing`);
        expect(listing.quantity.toString()).to.be.equal("1");
        expect(listing.payToken).to.be.equal(constants.ZERO_ADDRESS);
        expect(weiToEther(listing.pricePerItem) * 1).to.be.equal(20);
        expect(listing.startingTime.toString()).to.be.equal("1632304800");

        balance1 = await web3.eth.getBalance(buyer);
        console.log(`
        The buyer's ETH balance before buying: ${weiToEther(balance1)}`);

        balance2 = await web3.eth.getBalance(artist);
        console.log(`
        The artist's ETH balance before the nfts is sold: ${weiToEther(
          balance2
        )}`);

        balance3 = await web3.eth.getBalance(platformFeeRecipient);
        console.log(`
        The platform fee recipient before the nft is sold: ${weiToEther(
          balance3
        )}`);

        console.log(`
        Buyer buys the nft for 20 ETH`);
        result = await this.octaMarketplace.buyItem(
          this.octa.address,
          new BN("1"),
          artist,
          { from: buyer, value: ether("20") }
        );

        console.log(`
        *Event ItemSold should be emitted with correct values: 
        seller = ${artist}, 
        buyer = ${buyer}, 
        nft = ${this.octa.address},
        tokenId = 1,
        quantity =1,
        payToken = ${constants.ZERO_ADDRESS},
        pricePerItem = 20`);
        expectEvent(result, "ItemSold", {
          seller: artist,
          buyer: buyer,
          nft: this.octa.address,
          tokenId: new BN("1"),
          quantity: new BN("1"),
          payToken: constants.ZERO_ADDRESS,
          pricePerItem: ether("20"),
        });

        let nftOwner = await this.octa.ownerOf(new BN("1"));
        console.log(`
        The owner of the nft now should be the buyer`);
        expect(nftOwner).to.be.equal(buyer);

        balance4 = await web3.eth.getBalance(buyer);
        console.log(`
        The buyer's ETH balance after buying: ${weiToEther(balance4)}`);

        console.log(`
        *The difference of the buyer's ETH balance should be more than 20 OCTs as buying costs some gases
        but should be less than 21 ETH as the gas shouldn't cost more than 1 ETH`);
        expect(
          weiToEther(balance1) * 1 - weiToEther(balance4) * 1
        ).to.be.greaterThan(20);
        expect(
          weiToEther(balance1) * 1 - weiToEther(balance4) * 1
        ).to.be.lessThan(21);

        let balance5 = await web3.eth.getBalance(artist);
        console.log(`
        The artist's ETH balance after the nfts is sold: ${weiToEther(
          balance5
        )}`);
        console.log(`
        *The difference of the artist's ETH balance should be 19 ETH`);
        expect(
          (weiToEther(balance5) * 1 - weiToEther(balance2) * 1).toFixed(5) * 1
        ).to.be.equal(19);

        balance6 = await web3.eth.getBalance(platformFeeRecipient);
        console.log(`
        The platform fee recipient after the nft is sold: ${weiToEther(
          balance6
        )}`);
        console.log(`
        *The difference of the platform fee recipient's ETH balance should be 1 ETH`);
        expect(weiToEther(balance6) * 1 - weiToEther(balance3) * 1).to.be.equal(
          1
        );

        listing = await this.octaMarketplace.listings(
          this.octa.address,
          new BN("1"),
          artist
        );
        console.log(`
        *The nft now should be removed from the listing`);
        expect(listing.quantity.toString()).to.be.equal("0");
        expect(listing.payToken).to.be.equal(constants.ZERO_ADDRESS);
        expect(weiToEther(listing.pricePerItem) * 1).to.be.equal(0);
        expect(listing.startingTime.toString()).to.be.equal("0");

        console.log("");
      });

      it("Scenario 3", async function () {
        console.log(`
        Scenario 3:
        An artist mints an NFT from him/herself
        He/She then put it on an auction with reserve price of 20 OCT
        Bidder1, bidder2, bidder3 then bid the auction with 20 OCT, 25 OCT, and 30 OCT respectively`);

        let balance = await this.octa.platformFee();
        console.log(`
        Platform Fee: ${weiToEther(balance)}`);

        let balance1 = await web3.eth.getBalance(artist);
        console.log(`
        ETH balance of artist before minting: ${weiToEther(balance1)}`);

        let balance2 = await web3.eth.getBalance(platformFeeRecipient);
        console.log(`
        ETH balance of the fee recipient before minting: ${weiToEther(
          balance2
        )}`);

        console.log(`
        Now minting...`);
        let result = await this.octa.mint(
          artist,
          "http://artist.com/art.jpeg",
          { from: artist, value: ether(PLATFORM_FEE) }
        );
        console.log(`
        Minted successfully`);

        let balance3 = await web3.eth.getBalance(artist);
        console.log(`
        ETH balance of artist after minting: ${weiToEther(balance3)}`);

        let balance4 = await web3.eth.getBalance(platformFeeRecipient);
        console.log(`
        ETH balance of recipient after minting: ${weiToEther(balance4)}`);

        console.log(`
        *The difference of the artist's ETH balance should be more than ${PLATFORM_FEE} ETH as 
        the platform fee is ${PLATFORM_FEE} ETH and minting costs some gases
        but should be less than ${
          Number(PLATFORM_FEE) + 1
        } ETH as the gas fees shouldn't be more than 1 ETH`);
        expect(
          weiToEther(balance1) * 1 - weiToEther(balance3) * 1
        ).to.be.greaterThan(PLATFORM_FEE * 1);
        expect(
          weiToEther(balance1) * 1 - weiToEther(balance3) * 1
        ).to.be.lessThan(PLATFORM_FEE * 1 + 1);

        console.log(`
        *The difference of the recipients's ETH balance should be ${PLATFORM_FEE} ETH as the platform fee is ${PLATFORM_FEE} ETH `);
        expect(weiToEther(balance4) * 1 - weiToEther(balance2) * 1).to.be.equal(
          PLATFORM_FEE * 1
        );

        console.log(`
        *Event Minted should be emitted with correct values: 
        tokenId = 1, 
        beneficiary = ${artist}, 
        tokenUri = ${"http://artist.com/art.jpeg"},
        minter = ${artist}`);
        expectEvent.inLogs(result.logs, "Minted", {
          tokenId: new BN("1"),
          beneficiary: artist,
          tokenUri: "http://artist.com/art.jpeg",
          minter: artist,
        });

        console.log(`
        The artist approves the nft to the market`);
        await this.octa.setApprovalForAll(this.octaAuction.address, true, {
          from: artist,
        });

        console.log(`
        Let's mock that the current time: 2021-09-25 10:00:00`);
        await this.octaAuction.setTime(new BN("1632564000"));

        console.log(`
        The artist auctions his nfts with reserve price of 20 OCT`);
        result = await this.octaAuction.createAuction(
          this.octa.address,
          new BN("1"),
          this.mockERC20.address,
          ether("20"),
          new BN("1632564000"), // 2021-09-25 10:00:00
          new BN("1632996000"), // 2021-09-30 10:00:00
          { from: artist }
        );

        console.log(`
        *Event AuctionCreated should be emitted with correct values: 
        nftAddress = ${this.octa.address}, 
        tokenId = 1, 
        payToken = ${this.mockERC20.address}`);
        expectEvent.inLogs(result.logs, "AuctionCreated", {
          nftAddress: this.octa.address,
          tokenId: new BN("1"),
          payToken: this.mockERC20.address,
        });

        console.log(`
        Mint 50 OCT to bidder1 so he can bid the auctioned nft`);
        await this.mockERC20.mint(bidder1, ether("50"));

        console.log(`
        Bidder1 approves OctaMarketplace to transfer up to 50 OCT`);
        await this.mockERC20.approve(this.octaAuction.address, ether("50"), {
          from: bidder1,
        });

        console.log(`
        Mint 50 OCT to bidder2 so he can bid the auctioned nft`);
        await this.mockERC20.mint(bidder2, ether("50"));

        console.log(`
        Bidder2 approves OctaMarketplace to transfer up to 50 OCT`);
        await this.mockERC20.approve(this.octaAuction.address, ether("50"), {
          from: bidder2,
        });

        console.log(`
        Mint 50 OCT to bidder3 so he can bid the auctioned nft`);
        await this.mockERC20.mint(bidder3, ether("50"));

        console.log(`
        Bidder3 approves OctaMarketplace to transfer up to 50 OCT`);
        await this.mockERC20.approve(this.octaAuction.address, ether("50"), {
          from: bidder3,
        });

        console.log(`
        Bidder1 place a bid of 20 OCT`);
        await this.octaAuction.placeBidWithERC20(
          this.octa.address,
          new BN("1"),
          ether("20"),
          { from: bidder1 }
        );

        balance = await this.mockERC20.balanceOf(bidder1);
        console.log(`
        *Bidder1's OCT balance after bidding should be 30 OCT`);
        expect(weiToEther(balance) * 1).to.be.equal(30);

        console.log(`
        Bidder2 place a bid of 25 OCT`);
        await this.octaAuction.placeBidWithERC20(
          this.octa.address,
          new BN("1"),
          ether("25"),
          { from: bidder2 }
        );

        balance = await this.mockERC20.balanceOf(bidder1);
        console.log(`
        *Bidder1's OCT balance after bidder2 outbid should be back to 50 OCT`);
        expect(weiToEther(balance) * 1).to.be.equal(50);

        balance = await this.mockERC20.balanceOf(bidder2);
        console.log(`
        *Bidder2's OCT balance after bidding should be 25`);
        expect(weiToEther(balance) * 1).to.be.equal(25);

        console.log(`
        Bidder3 place a bid of 30 OCT`);
        await this.octaAuction.placeBidWithERC20(
          this.octa.address,
          new BN("1"),
          ether("30"),
          { from: bidder3 }
        );

        balance = await this.mockERC20.balanceOf(bidder2);
        console.log(`
        *Bidder2's OCT balance after bidder3 outbid should be back to 50 OCT`);
        expect(weiToEther(balance) * 1).to.be.equal(50);

        balance = await this.mockERC20.balanceOf(bidder3);
        console.log(`
        *Bidder3's OCT balance after bidding should be 20`);
        expect(weiToEther(balance) * 1).to.be.equal(20);

        console.log(`
        Let's mock that the current time: 2021-09-30 11:00:00 so the auction has ended`);
        await this.octaAuction.setTime(new BN("1632999600"));

        console.log(`
        The artist tries to make the auction complete`);
        result = await this.octaAuction.resultAuction(
          this.octa.address,
          new BN("1"),
          { from: artist }
        );

        console.log(`
        *As the platformFee is 2.5%, the platform fee recipient should get 2.5% of (30 - 20) which is 0.25 OCT.`);
        balance = await this.mockERC20.balanceOf(platformFeeRecipient);
        expect(weiToEther(balance) * 1).to.be.equal(0.25);

        console.log(`
        *The artist should get 29.75 OCT.`);
        balance = await this.mockERC20.balanceOf(artist);
        expect(weiToEther(balance) * 1).to.be.equal(29.75);

        let nftOwner = await this.octa.ownerOf(new BN("1"));
        console.log(`
        *The owner of the nft now should be the bidder3`);
        expect(nftOwner).to.be.equal(bidder3);

        console.log(`
        *Event AuctionResulted should be emitted with correct values: 
        nftAddress = ${this.octa.address}, 
        tokenId = 1,
        winner = ${bidder3} ,
        payToken = ${this.mockERC20.address},
        unitPrice = 0,
        winningBid = 30`);
        expectEvent(result, "AuctionResulted", {
          nftAddress: this.octa.address,
          tokenId: new BN("1"),
          winner: bidder3,
          payToken: this.mockERC20.address,
          winningBid: ether("30"),
        });
      });

      it("Scenario 4", async function () {
        console.log(`
        Scenario 4:
        An artist mints an NFT from him/herself
        He/She then put it on an auction with reserve price of 10 ETH
        Bidder1, bidder2, bidder3 then bid the auction with 10 ETH, 15 ETH, and 20 ETH respectively`);

        let balance = await this.octa.platformFee();
        console.log(`
        Platform Fee: ${weiToEther(balance)}`);

        let balance1 = await web3.eth.getBalance(artist);
        console.log(`
        ETH balance of artist before minting: ${weiToEther(balance1)}`);

        let balance2 = await web3.eth.getBalance(platformFeeRecipient);
        console.log(`
        ETH balance of the fee recipient before minting: ${weiToEther(
          balance2
        )}`);

        console.log(`
        Now minting...`);
        let result = await this.octa.mint(
          artist,
          "http://artist.com/art.jpeg",
          { from: artist, value: ether(PLATFORM_FEE) }
        );
        console.log(`
        Minted successfully`);

        let balance3 = await web3.eth.getBalance(artist);
        console.log(`
        ETH balance of artist after minting: ${weiToEther(balance3)}`);

        let balance4 = await web3.eth.getBalance(platformFeeRecipient);
        console.log(`
        ETH balance of recipient after minting: ${weiToEther(balance4)}`);

        console.log(`
        *The difference of the artist's ETH balance should be more than ${PLATFORM_FEE} ETH as 
        the platform fee is ${PLATFORM_FEE} ETH and minting costs some gases
        but should be less than ${
          +PLATFORM_FEE + 1
        } ETH as the gas fees shouldn't be more than 1 ETH`);
        expect(
          weiToEther(balance1) * 1 - weiToEther(balance3) * 1
        ).to.be.greaterThan(PLATFORM_FEE * 1);
        expect(
          weiToEther(balance1) * 1 - weiToEther(balance3) * 1
        ).to.be.lessThan(PLATFORM_FEE * 1 + 1);

        console.log(`
        *The difference of the recipients's ETH balance should be ${PLATFORM_FEE} ETH as the platform fee is ${PLATFORM_FEE} ETH `);
        expect(weiToEther(balance4) * 1 - weiToEther(balance2) * 1).to.be.equal(
          PLATFORM_FEE * 1
        );

        console.log(`
        *Event Minted should be emitted with correct values: 
        tokenId = 1, 
        beneficiary = ${artist}, 
        tokenUri = ${"http://artist.com/art.jpeg"},
        minter = ${artist}`);
        expectEvent.inLogs(result.logs, "Minted", {
          tokenId: new BN("1"),
          beneficiary: artist,
          tokenUri: "http://artist.com/art.jpeg",
          minter: artist,
        });

        console.log(`
        The artist approves the nft to the market`);
        await this.octa.setApprovalForAll(this.octaAuction.address, true, {
          from: artist,
        });

        console.log(`
        Let's mock that the current time: 2021-09-25 10:00:00`);
        await this.octaAuction.setTime(new BN("1632564000"));

        console.log(`
        The artist auctions his nfts with reserve price of 20 OCTs`);
        result = await this.octaAuction.createAuction(
          this.octa.address,
          new BN("1"),
          constants.ZERO_ADDRESS,
          ether("10"),
          new BN("1632564000"), //2021-09-25 10:00:00
          new BN("1632996000"), //2021-09-30 10:00:00
          { from: artist }
        );

        console.log(`
        *Event AuctionCreated should be emitted with correct values: 
        nftAddress = ${this.octa.address}, 
        tokenId = 1, 
        payToken = ${constants.ZERO_ADDRESS}`);
        expectEvent.inLogs(result.logs, "AuctionCreated", {
          nftAddress: this.octa.address,
          tokenId: new BN("1"),
          payToken: constants.ZERO_ADDRESS,
        });

        balance1 = await web3.eth.getBalance(bidder1);
        console.log(`
        Bidder1's ETH balance before bidding: ${weiToEther(balance1)}`);

        console.log(`
        Bidder1 places a bid of 10 ETH`);
        await this.octaAuction.placeBid(this.octa.address, new BN("1"), {
          from: bidder1,
          value: ether("10"),
        });

        balance2 = await web3.eth.getBalance(bidder1);
        console.log(`
        Bidder1's ETH balance after bidding: ${weiToEther(balance2)}`);

        console.log(`
        *The difference of bidder1's ETH balance before and after bidding 
        should be more than 10 but less than 11 assuming that the gas fees are less than 1 ETH`);
        expect(
          weiToEther(balance1) * 1 - weiToEther(balance2) * 1
        ).to.be.greaterThan(10);
        expect(
          weiToEther(balance1) * 1 - weiToEther(balance2) * 1
        ).to.be.lessThan(11);

        balance3 = await web3.eth.getBalance(bidder2);
        console.log(`
        Bidder2's ETH balance before bidding: ${weiToEther(balance3)}`);

        console.log(`
        Bidder2 places a bid of 15 ETH`);
        await this.octaAuction.placeBid(this.octa.address, new BN("1"), {
          from: bidder2,
          value: ether("15"),
        });

        balance4 = await web3.eth.getBalance(bidder2);
        console.log(`
        Bidder2's ETH balance after bidding: ${weiToEther(balance4)}`);

        console.log(`
        *The difference of bidder2's ETH balance before and after bidding 
        should be more than 15 but less than 16 assuming that the gas fees are less than 1 ETH`);
        expect(
          weiToEther(balance3) * 1 - weiToEther(balance4) * 1
        ).to.be.greaterThan(15);
        expect(
          weiToEther(balance3) * 1 - weiToEther(balance4) * 1
        ).to.be.lessThan(16);

        balance1 = await web3.eth.getBalance(bidder1);
        console.log(`
        Bidder1's ETH balance after bidder2 outbid bidder1: ${weiToEther(
          balance1
        )}`);

        console.log(`
        *The difference of bidder1's ETH balance before and after 
        being outbid by bidder2 should 10`);
        expect(weiToEther(balance1) * 1 - weiToEther(balance2) * 1).to.be.equal(
          10
        );

        balance5 = await web3.eth.getBalance(bidder3);
        console.log(`
        Bidder3's ETH balance before bidding: ${weiToEther(balance5)}`);

        console.log(`
        Bidder3 places a bid of 20 ETH`);
        await this.octaAuction.placeBid(this.octa.address, new BN("1"), {
          from: bidder3,
          value: ether("20"),
        });

        balance6 = await web3.eth.getBalance(bidder3);
        console.log(`
        Bidder3's ETH balance after bidding: ${weiToEther(balance6)}`);

        console.log(`
        *The difference of bidder3's ETH balance before and after bidding 
        should be more than 20 but less than 21 assuming that the gas fees are less than 1 ETH`);
        expect(
          weiToEther(balance5) * 1 - weiToEther(balance6) * 1
        ).to.be.greaterThan(20);
        expect(
          weiToEther(balance5) * 1 - weiToEther(balance6) * 1
        ).to.be.lessThan(21);

        balance3 = await web3.eth.getBalance(bidder2);
        console.log(`
        Bidder2's ETH balance after bidder3 outbid bidder2: ${weiToEther(
          balance3
        )}`);

        console.log(`
        *The difference of bidder2's ETH balance before and after 
        being outbid by bidder3 should 15`);
        expect(weiToEther(balance3) * 1 - weiToEther(balance4) * 1).to.be.equal(
          15
        );

        console.log(`
        Let's mock that the current time: 2021-09-30 11:00:00 so the auction has ended`);
        await this.octaAuction.setTime(new BN("1632999600"));

        balance1 = await web3.eth.getBalance(platformFeeRecipient);
        console.log(`
        The platform fee recipient's ETH balance 
        before the artist completes the auction: ${weiToEther(balance1)}`);

        balance3 = await web3.eth.getBalance(artist);
        console.log(`
        The artist's ETH balance 
        before he completes the auction: ${weiToEther(balance3)}`);

        console.log(`
        The artist tries to make the auction complete`);
        result = await this.octaAuction.resultAuction(
          this.octa.address,
          new BN("1"),
          { from: artist }
        );

        balance2 = await web3.eth.getBalance(platformFeeRecipient);
        console.log(`
        The platform fee recipient's ETH balance 
        after the artist completes the auction: ${weiToEther(balance2)}`);

        balance4 = await web3.eth.getBalance(artist);
        console.log(`
        The artist's ETH balance 
        after he completes the auction: ${weiToEther(balance4)}`);

        console.log(`
        *As the platformFee is 2.5%, the platform fee recipient should get 2.5% of (20 - 10) which is 0.25.`);
        expect(
          (weiToEther(balance2) * 1 - weiToEther(balance1) * 1).toFixed(2)
        ).to.be.equal("0.25");

        console.log(`
        *The difference of the artist's ETH balance before and after 
        the auction completes should be 19.75`);
        expect(
          (weiToEther(balance4) * 1 - weiToEther(balance3) * 1).toFixed(2)
        ).to.be.equal("19.75");

        let nftOwner = await this.octa.ownerOf(new BN("1"));
        console.log(`
        *The owner of the nft now should be the bidder3`);
        expect(nftOwner).to.be.equal(bidder3);

        console.log(`
        *Event AuctionResulted should be emitted with correct values: 
        nftAddress = ${this.octa.address}, 
        tokenId = 1,
        winner = ${bidder3} ,
        payToken = ${constants.ZERO_ADDRESS},
        unitPrice = 0,
        winningBid = 20`);
        expectEvent.inLogs(result.logs, "AuctionResulted", {
          nftAddress: this.octa.address,
          tokenId: new BN("1"),
          winner: bidder3,
          payToken: constants.ZERO_ADDRESS,
          winningBid: ether("20"),
        });
      });
    });
  }
);
