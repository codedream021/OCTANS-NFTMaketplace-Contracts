const hre = require("hardhat");
const {
  TREASURY_ADDRESS,
  AUCTION,
  MARKETPLACE,
  PLATFORM_FEE,
} = require("./constants");

async function main() {
  const Factory = await hre.ethers.getContractFactory("OctaNFTFactory");
  const factory = await Factory.deploy(
    AUCTION,
    MARKETPLACE,
    "10000000000000000000",
    TREASURY_ADDRESS,
    PLATFORM_FEE
  );
  await factory.deployed();
  console.log("OctaNFTFactory deployed to:", factory.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
