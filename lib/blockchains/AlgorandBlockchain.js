const BigNumber = require('bignumber.js')
const algosdk = require('algosdk')
const { TxValidator } = require("../TxValidator")
const HotWallet = require("../HotWallet").HotWallet
const JSONbig = require("json-bigint")

class AlgorandBlockchain {
  constructor(envs) {
    this.envs = envs
    this.blockchainNetwork = envs.blockchainNetwork
    const endpoints = this.endpointsByNetwork(this.blockchainNetwork)
    const token = {
      'x-api-key': this.envs.purestakeApi
    }
    this.algodClient = new algosdk.Algodv2(token, endpoints.url, '')
    this.indexerClient = new algosdk.Indexer(token, endpoints.indexerUrl, '')

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
    return {
      url: 'https://mainnet-algorand.api.purestake.io/ps2',
      indexerUrl: 'https://mainnet-algorand.api.purestake.io/idx2',
    }
  }

  testnetEndpoints() {
    return {
      url: 'https://testnet-algorand.api.purestake.io/ps2',
      indexerUrl: 'https://testnet-algorand.api.purestake.io/idx2',
    }
  }

  betanetEndpoints() {
    return {
      url: 'https://betanet-algorand.api.purestake.io/ps2',
      indexerUrl: 'https://betanet-algorand.api.purestake.io/idx2',
    }
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

  withdrawAppTokensTx(hotWalletAddress, appIndex, withdrawalAddress, tokensAmount) {
    return {
      txRaw: JSON.stringify({
        type: "appl",
        from: hotWalletAddress,
        appIndex: appIndex,
        value: "0x0",
        appAccounts: [withdrawalAddress],
        appArgs: `str:transfer,int:${tokensAmount}`, // transfer
        appOnComplete: 0
      })
    }
  }

  clearAppTx(hotWalletAddress, appIndex) {
    return {
      txRaw: JSON.stringify({
        type: "applClear",
        from: hotWalletAddress,
        appIndex: appIndex,
        value: "0x0",
        appAccounts: [hotWalletAddress],
        appOnComplete: algosdk.OnApplicationComplete.ClearStateOC
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


  async generateNewWallet() {
    const account = algosdk.generateAccount()
    const keypair = {
      publicKey: account.addr,
      privateKey: Buffer.from(account.sk).toString('hex')
    }

    return new HotWallet(this.blockchainNetwork, account.addr, keypair)
  }

  async getAppLocalState(hotWalletAddress, appIndex) {
    try {
      const hwAccountDetails = await this.indexerClient.lookupAccountByID(hotWalletAddress).do()
      return hwAccountDetails.account['apps-local-state'].filter(app => !app.deleted && app.id === appIndex)[0]
    } catch (err) {
      return {}
    }
  }

  async getTokenBalance(hotWalletAddress) {
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
      const hwAccountDetails = await this.indexerClient.lookupAccountByID(hotWalletAddress).do()
      return hwAccountDetails.account['apps-local-state'].filter(app => app.deleted == false).map(app => app.id)
    } catch (err) {
      return []
    }
  }

  async getOptedInAppsForHotWallet(hotWalletAddress) {
    if (hotWalletAddress in this.optedInApps) { return this.optedInApps[hotWalletAddress] }

    const optedInApps = await this.getOptedInAppsFromBlockchain(hotWalletAddress)
    if (optedInApps.length > 0) {
      this.optedInApps[hotWalletAddress] = optedInApps
    } else {
      console.log(`The Hot Wallet either has zero algos balance or doesn't opted-in to any app. Please send ALGOs to the wallet ${hotWalletAddress}`)
    }

    return optedInApps
  }

  async getAlgoBalanceForHotWallet(hotWalletAddress) {
    let balance
    try {
      const accountInfo = await this.algodClient.accountInformation(hotWalletAddress).do()
      balance = accountInfo.amount
    } catch (err) {
      if (err.message.includes('no accounts found for address')) {
        balance = 0
      } else {
        console.log(`Failed to get balance for wallet: ${err.message}`)
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
    return algoBalance.isGreaterThan(new BigNumber(algosdk.ALGORAND_MIN_TX_FEE)) // 1000 microalgos
  }

  async optInToApp(hotWallet, appToOptIn) {
    const AlgorandTxHelper = (await import('../AlgorandTxHelper.mjs')).default // Dynamic import
    const algoTxHelper = new AlgorandTxHelper(this.algodClient)
    const tx = {
      type: 'appl',
      from: hotWallet.address,
      note: 'Opt-in from a HotWallet',
      appIndex: appToOptIn,
      appOnComplete: algosdk.OnApplicationComplete.OptInOC,
      appAccounts: [hotWallet.address],
    }

    const transaction = await algoTxHelper.create(tx)
    const signedTxn = transaction.signTxn(hotWallet.klass.algoPrivateKey)

    try {
      let txResult = await this.algodClient.sendRawTransaction(signedTxn).do();
      console.log(`Opt-in was successfully sent to blockchain, tx hash: ${txResult.txId}`)
      return txResult
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

  async getApplicationTxError(tx) {
    const AlgorandApplicationTxValidator = (await import('../validators/AlgorandAppTxValidator.mjs')).AlgorandApplicationTxValidator // Dynamic import
    try {
      if (tx.type === 'appl') {
        const appValidator = new AlgorandApplicationTxValidator(this.algodClient)
        await appValidator.validateTx(tx)
      }
    } catch (error) {
      return error
    }
  }

  async sendTransaction(transaction, hotWallet) {
    const AlgorandTxHelper = (await import('../AlgorandTxHelper.mjs')).default // Dynamic import
    const algoTxHelper = new AlgorandTxHelper(this.algodClient)
    let tx
    try {
      tx = JSONbig.parse(transaction.txRaw ?? "{}")
      const txn = await algoTxHelper.create(tx)

      // validate enough gas
      if (new BigNumber(txn.fee).isGreaterThan(await this.getAlgoBalanceForHotWallet(hotWallet.address))) {
        const errorMessage = `The Hot Wallet has insufficient algo to pay a fee. Please top up the ${hotWallet.address}`
        console.error(errorMessage)
        return { valid: false, markAs: "cancelled", error: errorMessage }
      }

      const signedTxn = txn.signTxn(hotWallet.klass.algoPrivateKey)
      const txResult = await this.algodClient.sendRawTransaction(signedTxn).do()

      console.log(`Transaction has successfully signed and sent by ${hotWallet.address} to blockchain tx hash: ${txResult.txId}`)
      return { transactionId: txResult.txId, valid: true }
    } catch (err) {
      let internalError = await this.getApplicationTxError(tx)
      if (internalError) {
        console.error(internalError)
        return { valid: false, markAs: "cancelled", error: internalError.message }
      }
      console.error(err)
      return { valid: false, markAs: "failed", error: err.message }
    }
  }

  async sendWithdrawalCoinsTransaction(coinAddress, amountWithoutFee, hotWallet) {
    try {
      const txn = this.withdrawCoinsTx(hotWallet.address, coinAddress, amountWithoutFee)
      const txResult = await this.sendTransaction(txn, hotWallet)

      console.log(`Transaction has successfully signed and sent by ${hotWallet.address} to blockchain tx hash: ${txResult.transactionId}`)
      return txResult

    } catch (err) {
      console.error(err)
      return { valid: false, markAs: "failed", error: err.message }
    }
  }

  withdrawCoinsTx(hotWalletAddress, withdrawalAddress, coinsAmount) {
    return {
      network: this.blockchainNetwork,
      txRaw: JSON.stringify({
        type: "pay",
        from: hotWalletAddress,
        to: withdrawalAddress,
        amount: coinsAmount,
        closeRemainderTo: withdrawalAddress
      })
    }
  }

  // https://developer.algorand.org/docs/get-details/asa/#retrieve-asset-information
  // ASA balance and recipient must be opt-in for the asset id
  async disableWallet(withdrawalAddresses, hotWallet) {
    console.log("Robo wallet is going to be disabled...")
    const result = { tokensWithdrawalTx: {}, coinsWithdrawalTx: {} }

    if (withdrawalAddresses.tokenAddress) {
      const appTokenBalance = await this.getTokenBalance(hotWallet.address)

      if (appTokenBalance > 0) {
        // wait 1 sec to not get too many requests error 
        await new Promise(resolve => setTimeout(resolve, 1000))
        const txObject = this.withdrawAppTokensTx(hotWallet.address, this.envs.optInApp, withdrawalAddresses.tokenAddress, appTokenBalance)
        console.log(`Sending ${appTokenBalance} tokens to ${withdrawalAddresses.tokenAddress}`)
        const tx = await this.sendTransaction(txObject, hotWallet)

        if (typeof tx.valid === 'undefined' || tx.valid) {
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

      // wait 1 sec to not get too many requests error 
      await new Promise(resolve => setTimeout(resolve, 1000))
      const isOptedIn = await this.isOptedInToCurrentApp(hotWallet.address, this.envs.optInApp)
      if (isOptedIn && this.envs.optInApp && result.tokensWithdrawalTx.status !== "failed") {
        const txClearApp = this.clearAppTx(hotWallet.address, this.envs.optInApp)
        const txClearAppResult = await this.sendTransaction(txClearApp, hotWallet)
        if (typeof txClearAppResult.valid === 'undefined' || txClearAppResult.valid) {
          const msg = `Successfully sent close out Tx id: ${txClearAppResult.transactionId}`
          console.log(msg)
          result.clearAppTx = { status: "success", txHash: txClearAppResult.transactionId, message: msg }
        } else {
          const msg = `Error during close out tx`
          console.error(msg)
          result.clearAppTx = { status: "failed", txHash: null, message: msg }
        }
      } else {
        const msgOptInApp = this.envs.optInApp ? "" : "OptInApp is not defined"
        const msg = msgOptInApp ? `${msgOptInApp}, transaction skipped` : "Transaction skipped"
        result.clearAppTx = { status: "skipped", txHash: null, message: msg }
      }
    }

    if (withdrawalAddresses.coinAddress && result.tokensWithdrawalTx.status !== "failed") {
      // wait timeout in order to not get too many requests error and let nodes to sync balance after previous tx
      await new Promise(resolve => setTimeout(resolve, this.envs.algorandDisableWalletCoinBalanceReqTimeout * 1000))
      const coinBalance = await this.getAlgoBalanceForHotWallet(hotWallet.address)

      const txParams = await this.algodClient.getTransactionParams().do()
      const withdrawalFee = 2 * Math.max(txParams.fee, algosdk.ALGORAND_MIN_TX_FEE)
      if (coinBalance.isGreaterThan(new BigNumber(withdrawalFee))) {
        // ClearApplication is done so we can withdraw full balance without fee
        const amountWithoutFee = coinBalance - withdrawalFee

        const tx = await this.sendWithdrawalCoinsTransaction(withdrawalAddresses.coinAddress, amountWithoutFee, hotWallet)
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
        result.coinsWithdrawalTx = { status: "skipped", txHash: null, message: `ALGO balance is <= ${withdrawalFee}, transaction skipped` }
      }
    }
    return result
  }
}
exports.AlgorandBlockchain = AlgorandBlockchain
