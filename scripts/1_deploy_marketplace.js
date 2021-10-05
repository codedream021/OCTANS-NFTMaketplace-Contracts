const hre = require("hardhat");
require("dotenv").config();
const { TREASURY_ADDRESS, PLATFORM_FEE } = require("./constants");

async function main() {
  const ProxyAdmin = await hre.ethers.getContractFactory("ProxyAdmin");
  const proxyAdmin = await ProxyAdmin.deploy();
  await proxyAdmin.deployed();

  console.log("ProxyAdmin deployed to:", proxyAdmin.address);

  const Marketplace = await hre.ethers.getContractFactory("OctaMarketplace");
  const marketplaceImpl = await Marketplace.deploy();
  await marketplaceImpl.deployed();

  console.log("OctaMarketplace deployed to:", marketplaceImpl.address);

  const AdminUpgradeabilityProxyFactory = await hre.ethers.getContractFactory(
    "AdminUpgradeabilityProxy"
  );

  const marketplaceProxy = await AdminUpgradeabilityProxyFactory.deploy(
    marketplaceImpl.address,
    proxyAdmin.address,
    []
  );

  await marketplaceProxy.deployed();
  console.log("Marketplace Proxy deployed at ", marketplaceProxy.address);

  const marketplace = await hre.ethers.getContractAt(
    "OctaMarketplace",
    marketplaceProxy.address
  );
  await marketplace.initialize(TREASURY_ADDRESS, PLATFORM_FEE);
  console.log("Marketplace Proxy initialized");
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
