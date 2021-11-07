# Robowallet

## Deploy to Heroku

### Preparing

You need to prepare `PROJECT_API_KEY` before deploy. It can be generated in the project's settings on Comakery.

### One-click Deploy

Open project's transfers page as an admin. You will see "Deploy a robo wallet" link if it not deployed yet.
In this way it fill all nefcessary fields except of `PROJECT_API_KEY`, so fill this field manually.

##### Important note:

For projects with attached `LockupToken` contract you also must fill `ETHEREUM_APPROVAL_CONTRACT_ADDRESS` manully.
It should be filled with basic ERC20 contract address which the LockupToken contract operates.

### Manual Deploy

As an alternative you can click the link bellow and fill all ENVs manully but you must know what to do.

[![Deploy](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy?template=https://github.com/CoMakery/robowallet)

### Preparing of the Robo Wallet

After successful deploy you can see the Robo Wallet address on the Project's transfers page.
Now we must configure this wallet to be able to sign and transfer transactions.

#### Top up ETHs

First of all the Robo Wallet must have enough ETHs to pay a fee for each transaction, so you should top up the Robo Wallet address.

#### Top up tokens

To send tokens the Robo Wallet must have enough token balance, so top up the Robo Wallet address with tokens.

### Setup development enviroment:
```shell
yarn install
cp .env.example .env
```

Change ENV variables to actual in `.env` file.


### EIP-1559 Transaction fees estimation

The standard defines following rules for transaction fees:

```
1) TxFee = (baseFeePerGas + maxPriorityFeePerGas) * gasAmount

2) MaxFeePerGas >= (baseFeePerGas + maxPriorityFeePerGas)
```

`TxFee` - total amount in gwei to be paid as transaction fee (calculated by network)

`baseFeePerGas` – amount in gwei to be burnt after tx is included in a block (calculated by network, rotates with every block)

`maxPriorityFeePerGas` – amount in gwei to be trasnfered to a miner (controlled with env variable)

`MaxFeePerGas` – max amount in gwei per gas to be paid as transaction fee (controlled with env variable)


### Manage process:
```shell
bin/start   # Start Robowallet
bin/stop    # Stop Robowallet
bin/restart # Restart Robowallet
bin/list    # List processes
bin/logs    # Show logs
```

### Run tests:
```shell
yarn test
```
