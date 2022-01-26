const algosdk = require("algosdk")
const chainjs = require("@open-rights-exchange/chainjs")

// Custom classes
const HotWallet = require("./HotWallet").HotWallet
exports.HotWallet = HotWallet
const HotWalletRedis = require("./HotWalletRedis").HotWalletRedis
exports.HotWalletRedis = HotWalletRedis
const Blockchain = require("./Blockchain").Blockchain
exports.Blockchain = Blockchain
exports.AlgorandBlockchain = require("./Blockchain").AlgorandBlockchain
exports.EthereumBlockchain = require("./Blockchain").EthereumBlockchain
const ComakeryApi = require("./ComakeryApi").ComakeryApi
exports.ComakeryApi = ComakeryApi


exports.checkAllVariablesAreSet = function checkAllVariablesAreSet(envs) {
  const isRequiredVarsSet = Boolean(envs.projectId) && Boolean(envs.projectApiKey) && Boolean(envs.redisUrl)
    && Boolean(envs.comakeryServerUrl) && Boolean(envs.blockchainNetwork) && Boolean(envs.emptyQueueDelay)

  if (!isRequiredVarsSet) return false

  const variables = [
    {
      isEnvCorrect: Boolean(envs.infuraProjectId) && Boolean(envs.ethereumTokenSymbol) && Boolean(envs.ethereumContractAddress),
      blockchainNetworks: ["ethereum", "ethereum_ropsten", "ethereum_rinkeby"]
    },
    {
      isEnvCorrect: Boolean(envs.purestakeApi) && Boolean(envs.optInApp),
      blockchainNetworks: ["algorand", "algorand_test", "algorand_beta"]
    },
    {
      isEnvCorrect: Boolean(envs.figmentApiKey),
      blockchainNetworks: ["solana", "solana_devnet", "solana_testnet"]
    }
  ]

  const result = variables.some(function (item) {
    if (item.blockchainNetworks.indexOf(envs.blockchainNetwork) > -1) {
      return item.isEnvCorrect
    }

    return false
  })

  return result
}

exports.sleep = function (ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

exports.hotWalletInitialization = async function hotWalletInitialization(envs, redisClient) {
  const walletRedis = new HotWalletRedis(envs, redisClient)
  const hwCreated = await walletRedis.isHotWalletCreated()
  // TODO: Check if wallet disabled, exit from the app then

  if (hwCreated) {
    console.log("wallet already created, using it...")
  } else {
    console.log("Key file does not exists, generating...")
    const blockchain = new Blockchain(envs)
    const newWallet = await blockchain.generateNewWallet()
    const hwApi = new ComakeryApi(envs)
    const registerRes = await hwApi.registerHotWallet(newWallet)

    if (registerRes && registerRes.status == 201) {
      const hwRedis = new HotWalletRedis(envs, redisClient)
      await hwRedis.saveNewHotWallet(newWallet)
    } else {
      return false
    }
  }
  return true
}

exports.runServer = async function runServer(envs, redisClient) {
  const hwRedis = new HotWalletRedis(envs, redisClient)

  try {
    while (true) {
      let delay = envs.emptyQueueDelay

      const resTx = await exports.waitForNewTransaction(envs, hwRedis)

      if (["cancelled_transaction", "successfull"].indexOf(resTx.status) > -1) {
        delay = envs.betweenTransactionDelay
      } else if (resTx.status == "wallet_disabled_successfully") {
        delay = 86400 // 24h
      }

      console.log(`waiting ${delay} seconds`)
      await exports.sleep(delay * 1000)
    }
  } catch (err) {
    console.error(err)
    console.error(err.stack)
    process.exit(1) // kill the process to make pm2 restart
  }

}

exports.waitForNewTransaction = async function waitForNewTransaction(envs, hwRedis) {
  const hotWallet = await hwRedis.hotWallet()
  const hwAddress = await hotWallet.address
  const blockchain = new Blockchain(envs)

  const enoughCoins = await blockchain.enoughCoinBalanceToSendTransaction(hwAddress)
  if (!enoughCoins) {
    console.log(`The Hot Wallet does not have enough balance to send transactions. Please top up the ${hwAddress}`)
    return { status: "failed_before_getting_tx", blockchainTransaction: {}, transaction: {} }
  }

  const isReadyToSendTx = hotWallet.isReadyToSendTx(envs)
  if (!isReadyToSendTx) {
    if (hotWallet.isEthereum() && envs.ethereumApprovalContractAddress) {
      let approveTx
      if (envs.ethereumTokenType == "token_release_schedule") {
        // For Lockup contract + erc20 token we should send approve tx to erc20 token address to approve the Lockup contract
        approveTx = await blockchain.klass.approveContractTransactions(hotWallet, envs.ethereumApprovalContractAddress, envs.ethereumContractAddress)
      } else if (envs.ethereumTokenType == "erc20_batch") {
        // For erc20 + Batch contract we should send approve tx to erc20 token address to approve the Batch contract
        approveTx = await blockchain.klass.approveContractTransactions(hotWallet, envs.ethereumContractAddress, envs.ethereumApprovalContractAddress)
      }

      if (approveTx.transactionId) {
        hwRedis.saveApprovedContract(envs.ethereumApprovalContractAddress)
      }
    } else if (hotWallet.isAlgorand() && envs.optInApp) {
      // Opt-in to Algorand contract
      const isOptedIn = await blockchain.klass.optInOrSyncApp(hotWallet, envs.optInApp)

      if (isOptedIn) {
        const optedInApps = await blockchain.klass.getOptedInAppsForHotWallet(hotWallet.address)
        await hwRedis.saveOptedInApps(optedInApps)
      }
    }
  }

  console.log(`Checking for a new transaction to send from ${hwAddress}`)
  const hwApi = new ComakeryApi(envs)
  const blockchainTransaction = await hwApi.getNextTransactionToSign(hwAddress)

  if (blockchainTransaction.disableWalletWith) {
    const disableValues = blockchainTransaction.disableWalletWith
    const disableResult = await blockchain.disableWallet(disableValues, hotWallet)

    let disableStatus = 'disabled'
    const disableMessage = `${disableResult.tokensWithdrawalTx.message}, ${disableResult.coinsWithdrawalTx.message}`

    if (disableResult.tokensWithdrawalTx.status == "failed" || disableResult.coinsWithdrawalTx.status == "failed") {
      disableStatus = 'failed'
    }

    const disableRes = await hwApi.disableHotWallet(disableMessage, disableStatus)
    if (disableRes && disableRes.status == 200) {
      if (disableRes.data.status == "disabled") {
        console.log("Robo wallet was disabled successfully")
        return { status: "wallet_disabled_successfully", blockchainTransaction: {}, transaction: {} }
      } else {
        console.log("Robo wallet disable failed")
        return { status: "wallet_disabled_failed", blockchainTransaction: {}, transaction: {} }
      }
    } else {
      return { status: "wallet_disabled_error", blockchainTransaction: {}, transaction: {} }
    }
  }

  if (Object.keys(blockchainTransaction).length === 0) {
    return { "blockchainTransaction": {}, "status": "no_transaction", "transaction": {} }
  }

  const txValidation = await blockchain.isTransactionValid(blockchainTransaction, hwAddress)

  if (txValidation.valid) {
    const prevTx = await hwRedis.getSavedDataForTransaction(blockchainTransaction)

    if (prevTx) {
      const errorMessage = `The Hot Wallet already sent transaction at least for ${prevTx.key}, details: ${JSON.stringify(prevTx.values)}`
      console.log(errorMessage)
      await hwApi.cancelTransaction(blockchainTransaction, errorMessage, "failed")
      return { status: "tx_already_sent", blockchainTransaction: blockchainTransaction, transaction: {} }
    }

    console.log(`Found transaction to send, id=${blockchainTransaction.id}`)
    const tx = await blockchain.sendTransaction(blockchainTransaction, hotWallet)

    if (typeof tx.valid == 'undefined' || tx.valid) {
      // tx successfully sent
      blockchainTransaction.txHash = tx.transactionId

     if (blockchainTransaction.blockchainTransactableId && blockchainTransaction.blockchainTransactableType) {
        await hwRedis.saveDavaForTransaction("successfull", blockchainTransaction.blockchainTransactableType, blockchainTransaction.blockchainTransactableId, blockchainTransaction.txHash)
      } else if (Array.isArray(blockchainTransaction.blockchainTransactables) && blockchainTransaction.blockchainTransactables.length > 0) {
        blockchainTransaction.blockchainTransactables.forEach(async (bt) => {
          await hwRedis.saveDavaForTransaction("successfull", bt.blockchainTransactableType, bt.blockchainTransactableId, blockchainTransaction.txHash)
        })
      }

      await hwApi.updateTransactionHash(blockchainTransaction)
      return { status: "successfull", blockchainTransaction: blockchainTransaction, transaction: tx }
    } else {
      // tx failed during sending
      if (tx.markAs) {
        await hwApi.cancelTransaction(blockchainTransaction, tx.error, tx.markAs)
      }
      return { status: "cancelled_transaction", blockchainTransaction: blockchainTransaction, transaction: tx }
    }
  } else { // tx is invalid
    if (txValidation.markAs) {
      await hwApi.cancelTransaction(blockchainTransaction, txValidation.error, txValidation.markAs, txValidation.switchHWToManualMode)
    }
    return { status: "validation_failed", blockchainTransaction: blockchainTransaction, transaction: {} }
  }
}
