const hre = require("hardhat");
const { TREASURY_ADDRESS, PROXY_ADDRESS_TESTNET } = require("./constants");

async function main() {
  const Auction = await hre.ethers.getContractFactory("OctaAuction");
  const auctionImpl = await Auction.deploy();
  await auctionImpl.deployed();
  console.log("OctaAuction deployed to:", auctionImpl.address);

  const AdminUpgradeabilityProxyFactory = await hre.ethers.getContractFactory(
    "AdminUpgradeabilityProxy"
  );

  // Mainnet
  //   const auctionProxy = await AdminUpgradeabilityProxyFactory.deploy(
  //     auctionImpl.address,
  //     PROXY_ADDRESS_MAINNET,
  //     []
  //   );

  //   Testnet;
  const auctionProxy = await AdminUpgradeabilityProxyFactory.deploy(
    auctionImpl.address,
    PROXY_ADDRESS_TESTNET,
    []
  );

  await auctionProxy.deployed();
  console.log("Auction Proxy deployed at ", auctionProxy.address);

  const auction = await hre.ethers.getContractAt(
    "OctaAuction",
    auctionProxy.address
  );
  await auction.initialize(TREASURY_ADDRESS);
  console.log("Auction Proxy initialized");
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
