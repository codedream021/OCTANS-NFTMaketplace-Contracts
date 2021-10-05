# Octa NFT Marketplace Hardhat Project

## Etherscan deployment

To try out Etherscan deployment, you first need to deploy a contract to an Ethereum network that's supported by Etherscan, such as Kovan.

In this project, copy the .env.template file to a file named .env, and then edit it to fill in the details. Enter your Etherscan API key, your Kovan node URL (eg from Alchemy), and the private key of the account which will send the deployment transaction. With a valid .env file in place, first deploy your contract:

```shell
hardhat run --network kovan scripts/1_deploy_marketplace.js
```

Then, copy the ProxyAdmin and Marketplace Proxy deployment address then paste it in to replace `PROXY_ADDRESS_TESTNET` and `MARKETPLACE` in constants file.

```shell
hardhat run --network kovan scripts/2_deploy_auction.js
```

Then, copy the Auction Proxy deployment address then paste it in to replace `AUCTION` in constants file.

```shell
hardhat run --network kovan scripts/3_deploy_nft_factory.js
```

Then, copy the NFT Factory deployment address then paste it in to replace `NFT_FACTORY` in constants file.
