# Octa NFT Marketplace Hardhat Project

## Etherscan deployment

To try out Etherscan deployment, you first need to deploy a contract to an Ethereum network that's supported by Etherscan, such as Kovan.

In this project, copy the .env.template file to a file named .env, and then edit it to fill in the details. Enter your Etherscan API key, your Kovan node URL (eg from Alchemy/Infura), and the private key of the account which will send the deployment transaction. With a valid .env file in place, first deploy your contract:

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

## BSC Testnet deployment
To try out Binance Smart Chain testnet deployment, you first need to deploy a contract to an Binance testnet network. Enter your private key of the account which will send the deployment transaction. With a valid .env file in place, first deploy your contract:

```shell
hardhat run --network testnet scripts/1_deploy_marketplace.js
```

Then, copy the ProxyAdmin and Marketplace Proxy deployment address then paste it in to replace `PROXY_ADDRESS_TESTNET` and `MARKETPLACE` in constants file.

```shell
hardhat run --network testnet scripts/2_deploy_auction.js
```

Then, copy the Auction Proxy deployment address then paste it in to replace `AUCTION` in constants file.

```shell
hardhat run --network testnet scripts/3_deploy_nft_factory.js
```

Then, copy the NFT Factory deployment address then paste it in to replace `NFT_FACTORY` in constants file.

You can verify the contracts deployment by going to https://testnet.bscscan.com/ and searching for any contract address.