const chainjs = require("@open-rights-exchange/chainjs")
const BigNumber = require('bignumber.js')
const { TxValidator } = require("../TxValidator")
const HotWallet = require("../HotWallet").HotWallet

class AlgorandBlockchain {
  constructor(envs) {
    this.envs = envs
    this.blockchainNetwork = envs.blockchainNetwork
    const endpoints = this.endpointsByNetwork(this.blockchainNetwork)
    this.chain = new chainjs.ChainFactory().create(chainjs.ChainType.AlgorandV1, endpoints)
    // It is necessary to cache values gotten from blockchain
    this.optedInApps = {}
    this.algoBalances = {}
    this.tokenBalances = {}
    this.txValidator = new TxValidator({
      type: 'algorand',
      envs: envs,
      blockchain: this
    })
  }

  mainnetEndpoints() {
    return [{
      url: 'https://mainnet-algorand.api.purestake.io/ps2',
      options: { indexerUrl: 'https://mainnet-algorand.api.purestake.io/idx2', headers: [{ 'x-api-key': this.envs.purestakeApi }] },
    }]
  }

  testnetEndpoints() {
    return [{
      url: 'https://testnet-algorand.api.purestake.io/ps2',
      options: { indexerUrl: 'https://testnet-algorand.api.purestake.io/idx2', headers: [{ 'x-api-key': this.envs.purestakeApi }] },
    }]
  }

  betanetEndpoints() {
    return [{
      url: 'https://betanet-algorand.api.purestake.io/ps2',
      options: { indexerUrl: 'https://betanet-algorand.api.purestake.io/idx2', headers: [{ 'x-api-key': this.envs.purestakeApi }] },
    }]
  }

  endpointsByNetwork(network) {
    switch (network) {
      case 'algorand_test':
        return this.testnetEndpoints()
      case 'algorand_beta':
        return this.betanetEndpoints()
      case 'algorand':
        return this.mainnetEndpoints()
      default:
        console.error("Unknown or unsupported network")
    }
  }

  createAccountOptions() {
    return {
      newKeysOptions: {
        password: 'hot_wallet_algorand_pwd',
        salt: 'hot_wallet_algorand_salt'
      }
    }
  }

  isEmptyObject(obj) {
    return Boolean(!Object.keys(obj).length)
  }

  toHex(d) {
    return  "0x" + Number(d).toString(16)
  }

  withdrawTokensTx(hotWalletAddress, appIndex, withdrawalAddress, tokensAmount) {
    return {
      txRaw: JSON.stringify({
        type: "appl",
        from: hotWalletAddress,
        appIndex: appIndex,
        value: "0x0",
        appAccounts: [withdrawalAddress],
        appArgs: ["0x7472616e73666572", tokensAmount], // transfer
        appOnComplete: 0
      })
    }
  }

  transferAlgoTx(hotWalletAddress, withdrawalAddress, mAlgosAmount) {
    return {
      from: hotWalletAddress,
      to: withdrawalAddress,
      amount: mAlgosAmount,
    }
  }

  async connect() {
    if (!this.chain.isConnected) {
      await this.chain.connect()
    }
  }

  async generateNewWallet() {
    await this.connect()

    const createAccount = this.chain.new.CreateAccount(this.createAccountOptions())
    await createAccount.generateKeysIfNeeded()

    return new HotWallet(this.blockchainNetwork, createAccount.accountName, createAccount.generatedKeys)
  }

  async getAppLocalState(hotWalletAddress, appIndex) {
    await this.connect()

    try {
      const hwAccountDetails = await this.chain.algoClientIndexer.lookupAccountByID(hotWalletAddress).do()
      return hwAccountDetails.account['apps-local-state'].filter(app => !app.deleted && app.id === appIndex)[0]
    } catch (err) {
      return {}
    }
  }

  async getTokenBalance(hotWalletAddress) {
    if (hotWalletAddress in this.tokenBalances) { return this.tokenBalances[hotWalletAddress] }

    const localState = (await this.getAppLocalState(hotWalletAddress, this.envs.optInApp))
    const values = localState["key-value"]
    if (!values) { return 0 }

    const balanceValueArray = values.filter(val => val.key === "YmFsYW5jZQ==") // balance
    if (balanceValueArray.length === 0) { return 0 }

    const balanceValue = balanceValueArray[0].value.uint

    this.tokenBalances[hotWalletAddress] = balanceValue
    return balanceValue
  }

  async getOptedInAppsFromBlockchain(hotWalletAddress) {
    try {
      const hwAccountDetails = await this.chain.algoClientIndexer.lookupAccountByID(hotWalletAddress).do()
      return hwAccountDetails.account['apps-local-state'].filter(app => app.deleted == false).map(app => app.id)
    } catch (err) {
      return []
    }
  }

  async getOptedInAppsForHotWallet(hotWalletAddress) {
    if (hotWalletAddress in this.optedInApps) { return this.optedInApps[hotWalletAddress] }

    await this.connect()
    const optedInApps = await this.getOptedInAppsFromBlockchain(hotWalletAddress)
    if (optedInApps.length > 0) {
      this.optedInApps[hotWalletAddress] = optedInApps
    } else {
      console.log(`The Hot Wallet either has zero algos balance or doesn't opted-in to any app. Please send ALGOs to the wallet ${hotWalletAddress}`)
    }

    return optedInApps
  }

  async getAlgoBalanceForHotWallet(hotWalletAddress) {
    if (hotWalletAddress in this.algoBalances) { return this.algoBalances[hotWalletAddress] }

    await this.connect()
    let balance
    try {
      const blockchainBalance = await this.chain.fetchBalance(hotWalletAddress, chainjs.HelpersAlgorand.toAlgorandSymbol('algo'))
      balance = blockchainBalance.balance
    } catch (err) {
      if (err.message.includes('no accounts found for address')) {
        balance = 0
      } else {
        console.log(`Failed to get ballance for wallet: ${err.message}`)
      }
    }

    this.algoBalances[hotWalletAddress] = new BigNumber(balance)
    return this.algoBalances[hotWalletAddress]
  }

  async isOptedInToCurrentApp(hotWalletAddress, appIndex) {
    const optedInApps = await this.getOptedInAppsForHotWallet(hotWalletAddress)
    return optedInApps.includes(appIndex)
  }

  async enoughCoinBalanceToSendTransaction(hotWalletAddress) {
    const algoBalance = await this.getAlgoBalanceForHotWallet(hotWalletAddress)
    return algoBalance.isGreaterThan(new BigNumber(0.001)) // 1000 microalgos
  }

  async optInToApp(hotWallet, appToOptIn) {
    await this.connect()

    const transaction = await this.chain.new.Transaction()
    const txn = {
      from: hotWallet.address,
      note: 'Opt-in from a HotWallet',
      appIndex: appToOptIn,
    }
    const action = await this.chain.composeAction(chainjs.ModelsAlgorand.AlgorandChainActionType.AppOptIn, txn)
    transaction.actions = [action]
    await transaction.prepareToBeSigned()
    await transaction.validate()
    await transaction.sign([chainjs.HelpersAlgorand.toAlgorandPrivateKey(hotWallet.privateKey)])

    try {
      const tx_result = await transaction.send(chainjs.Models.ConfirmType.After001)
      console.log(`Opt-in was successfully sent to blockchain, tx hash: ${tx_result.transactionId}`)
      return tx_result
    } catch (err) {
      console.error(err)
      return {}
    }
  }

  async isTransactionValid(blockchainTransaction, hotWalletAddress) {
    return await this.txValidator.isTransactionValid(blockchainTransaction, hotWalletAddress)
  }

  async optInOrSyncApp(hotWallet, appIndex) {
    // Check if already opted-in on blockchain
    if (await this.isOptedInToCurrentApp(hotWallet.address, appIndex)) {
      console.log("HW is already opted-in. Got from Blockchain")
      return true
    }

    // Check if the wallet has enough balance to send opt-in transaction
    if (await this.enoughCoinBalanceToSendTransaction(hotWallet.address)) {
      const tx_result = await this.optInToApp(hotWallet, appIndex)

      if (this.isEmptyObject(tx_result)) {
        console.log(`Failed to opt-in into app ${appIndex} for wallet ${hotWallet.address}`)
        return false
      } else {
        console.log("HW successfully opted-in!")
        return true
      }
    }

    return false
  }

  async sendTransaction(transaction, hotWallet) {
    await this.connect()

    const chainTransaction = await this.chain.new.Transaction()

    try {
      // TODO: Update chanjs to use jsonParseAndRevive
      // await chainTransaction.setFromRaw(chainjs.HelpersAlgorand.jsonParseAndRevive(transaction.txRaw))
      const txn = JSON.parse(transaction.txRaw ?? "{}")
      let actionType = null
      if (txn.type === 'pay') {
        actionType = chainjs.ModelsAlgorand.AlgorandChainActionType.Payment
      } else if (txn.type === 'axfer') {
        actionType = chainjs.ModelsAlgorand.AlgorandChainActionType.AssetTransfer
      } else if (txn.type === 'appl') {
        actionType = chainjs.ModelsAlgorand.AlgorandChainActionType.AppNoOp
      }
      const action = await this.chain.composeAction(actionType, txn)
      chainTransaction.actions = [action]

      const algoFee = await chainTransaction.getSuggestedFee(chainjs.Models.TxExecutionPriority.Fast)
      // validate enough gas
      if (new BigNumber(algoFee).isGreaterThan(await this.getAlgoBalanceForHotWallet(hotWallet.address))) {
        const errorMessage = `The Hot Wallet has insufficient algo to pay a fee. Please top up the ${hotWallet.address}`
        console.error(errorMessage)
        return { valid: false, markAs: "cancelled", error: errorMessage}
      }

      await chainTransaction.setDesiredFee(algoFee)
      await chainTransaction.prepareToBeSigned()
      await chainTransaction.validate()
      await chainTransaction.sign([chainjs.HelpersAlgorand.toAlgorandPrivateKey(hotWallet.privateKey)])
      const tx_result = await chainTransaction.send(chainjs.Models.ConfirmType.After001)

      console.log(`Transaction has successfully signed and sent by ${hotWallet.address} to blockchain tx hash: ${tx_result.transactionId}`)
      return tx_result
    } catch (err) {
      console.error(err)
      return { valid: false, markAs: "failed", error: err.message }
    }
  }

  async sendWithdrawalCoinsTransaction(coinAddress, totalAmount, hotWallet) {
    await this.connect()

    var chainTransaction = await this.chain.new.Transaction()
    var txn = this.transferAlgoTx(hotWallet.address, coinAddress, totalAmount)

    try {
      var action = await this.chain.composeAction(chainjs.ModelsAlgorand.AlgorandChainActionType.Payment, txn)
      chainTransaction.actions = [action]
      const mAlgoFee = await chainTransaction.getSuggestedFee(chainjs.Models.TxExecutionPriority.Fast)

      // Algorand wallet minimal balance formula https://developer.algorand.org/docs/get-details/dapps/smart-contracts/apps/#minimum-balance-requirement-for-a-smart-contract
      // For the NOTE it should be 999750 micro algo
      const amountWithoutFee = totalAmount - mAlgoFee - 1000000
      chainTransaction = this.chain.new.Transaction()
      txn = this.transferAlgoTx(hotWallet.address, coinAddress, amountWithoutFee)
      action = await this.chain.composeAction(chainjs.ModelsAlgorand.AlgorandChainActionType.Payment, txn)
      chainTransaction.actions = [action]
      await chainTransaction.setDesiredFee(mAlgoFee)
      await chainTransaction.prepareToBeSigned()
      await chainTransaction.validate()
      await chainTransaction.sign([chainjs.HelpersAlgorand.toAlgorandPrivateKey(hotWallet.privateKey)])
      const tx_result = await chainTransaction.send(chainjs.Models.ConfirmType.After001)

      console.log(`Transaction has successfully signed and sent by ${hotWallet.address} to blockchain tx hash: ${tx_result.transactionId}`)
      return tx_result

    } catch (err) {
      console.error(err)
      return { valid: false, markAs: "failed", error: err.message }
    }
  }

  async disableWallet(withdrawalAddresses, hotWallet) {
    console.log("Robo wallet is going to be disabled...")
    const result = { tokensWithdrawalTx: {}, coinsWithdrawalTx: {} }
    if (withdrawalAddresses.tokenAddress) {
      const tokenBalance = await this.getTokenBalance(hotWallet.address)

      // wait 1 sec to not get too many requests error
      await new Promise(resolve => setTimeout(resolve, 1000))

      if (tokenBalance > 0) {
        const tokensInHex = this.toHex(tokenBalance)
        const txObject = this.withdrawTokensTx(hotWallet.address, this.envs.optInApp, withdrawalAddresses.tokenAddress, tokensInHex)
        console.log(`Sending ${tokenBalance} tokens to ${withdrawalAddresses.tokenAddress}`)

        const tx = await this.sendTransaction(txObject, hotWallet)
        // const tx = { transactionId: 'fake token tx' }

        if (typeof tx.valid == 'undefined' || tx.valid) {
          const msg = `Successfully sent Tx id: ${tx.transactionId}`
          console.log(msg)
          result.tokensWithdrawalTx = { status: "success", txHash: tx.transactionId, message: msg }
        } else {
          const msg = "Error during withdraw tokens tx"
          console.error(msg)
          result.tokensWithdrawalTx = { status: "failed", txHash: null, message: msg }
        }
      } else {
        result.tokensWithdrawalTx = { status: "skipped", txHash: null, message: "Tokens balance is zero, transaction skipped" }
      }
    }

    if (withdrawalAddresses.coinAddress) {
      const coinBalance = await this.getAlgoBalanceForHotWallet(hotWallet.address)
      if (coinBalance.isGreaterThan(new BigNumber(1.0)) && result.tokensWithdrawalTx.status !== "failed") {

        // wait 1 sec to not get too many requests error
        await new Promise(resolve => setTimeout(resolve, 1000))

        const mAlgosBalance = coinBalance.multipliedBy(1000000).toNumber()
        const tx = await this.sendWithdrawalCoinsTransaction(withdrawalAddresses.coinAddress, mAlgosBalance, hotWallet)
        // const tx = { valid: false, transactionId: 'fake eth tx' }

        if (typeof tx.valid == 'undefined' || tx.valid) {
          const msg = `Successfully sent Tx id: ${tx.transactionId}`
          console.log(msg)
          result.coinsWithdrawalTx = { status: "success", txHash: tx.transactionId, message: msg }
        } else {
          const msg = "Error during withdraw Algo tx"
          console.error(msg)
          result.coinsWithdrawalTx = { status: "failed", txHash: null, message: msg }
        }

      } else {
        result.coinsWithdrawalTx = { status: "skipped", txHash: null, message: "ALGO balance is <= 1, transaction skipped" }
      }
    }
    return result
  }
}
exports.AlgorandBlockchain = AlgorandBlockchain
