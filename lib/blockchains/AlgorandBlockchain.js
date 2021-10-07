const chainjs = require("@open-rights-exchange/chainjs")
const BigNumber = require('bignumber.js')
const HotWallet = require("../HotWallet").HotWallet
const algosdk = require('algosdk');

class AlgorandBlockchain {
  constructor(envs) {
    this.envs = envs
    this.blockchainNetwork = envs.blockchainNetwork
    const endpoints = this.endpointsByNetwork(this.blockchainNetwork)
    this.chain = new chainjs.ChainFactory().create(chainjs.ChainType.AlgorandV1, endpoints)
    this.client = undefined
    // It is necessary to cache values gotten from blockchain
    this.optedInApps = {}
    this.algoBalances = {}
    this.tokenBalances = {}
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

  hex2Uint(hexString) {
    if (hexString.slice(0,2) == '0x') {
      hexString = hexString.slice(2)
    }

    return new Uint8Array(hexString.match(/.{1,2}/g).map(byte => parseInt(byte, 16)))
  }

  async connect() {
    if (!this.client) {
      const endpoints = this.endpointsByNetwork(this.blockchainNetwork)[0]
      this.client = new algosdk.Algodv2(endpoints.options.headers[0], endpoints.url, '')
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
    const blockchainBalance = await this.chain.fetchBalance(hotWalletAddress, chainjs.HelpersAlgorand.toAlgorandSymbol('algo'))
    this.algoBalances[hotWalletAddress] = new BigNumber(blockchainBalance.balance)

    return this.algoBalances[hotWalletAddress]
  }

  async isOptedInToCurrentApp(hotWalletAddress, appIndex) {
    const optedInApps = await this.getOptedInAppsForHotWallet(hotWalletAddress)
    return optedInApps.includes(appIndex)
  }

  async enoughCoinBalanceToSendTransaction(hotWalletAddress) {
    // const algoBalance = await this.getAlgoBalanceForHotWallet(hotWalletAddress)
    // return algoBalance.isGreaterThan(new BigNumber(0.001)) // 1000 microalgos
    return true
  }

  async positiveTokenBalance(hotWalletAddress) {
    // const tokenBalance = await this.getTokenBalance(hotWalletAddress)
    // return tokenBalance > 0
    return true
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
    if (typeof blockchainTransaction.txRaw !== 'string') { return { valid: false } }

    try {
      const transaction = JSON.parse(blockchainTransaction.txRaw)

      // Is AppIndex for the current App?
      if (transaction.appIndex !== this.envs.optInApp) {
        const errorMessage = "The transaction is not for configured App."
        console.log(errorMessage)
        return { valid: false, markAs: "failed", error: errorMessage }
      }

      // Checks for transfer transaction
      if (transaction.appArgs[0] === "0x7472616e73666572") {
        const txTokensAmount = parseInt(transaction.appArgs[1])

        if (this.envs.maxAmountForTransfer > 0 && txTokensAmount > this.envs.maxAmountForTransfer) {
          const errorMessage = `The transaction has too big amount for transfer (${txTokensAmount}). Max amount is ${this.envs.maxAmountForTransfer}`
          console.log(errorMessage)
          return { valid: false, markAs: "failed", error: errorMessage }
        }

        // const hwTokensBalance = await this.getTokenBalance(hotWalletAddress)
        // if (hwTokensBalance < txTokensAmount) {
        //   const errorMessage = `The Hot Wallet has insufficient tokens to transfer (${hwTokensBalance} < ${txTokensAmount})`
        //   console.log(errorMessage)
        //   return { valid: false, markAs: "cancelled", error: errorMessage }
        // }
      }
      return { valid: true }
    } catch (err) {
      console.error(err)
      return { valid: false, markAs: "failed", error: `Unknown error: ${err}` }
    }
  }

  async optInOrSyncApp(hotWallet, appIndex) {
    // Check if already opted-in on blockchain
    if (await this.isOptedInToCurrentApp(hotWallet.address, appIndex)) {
      console.log("HW is already opted-in. Got from Blockchain")
      return true
    }

    // Check if the wallet has enough balance to send opt-in transaction
    if (await this.enoughCoinBalanceToSendTransaction(hotWallet.address)) {
      tx_result = await this.optInToApp(hotWallet, appIndex)
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

  /**
   * utility function to wait on a transaction to be confirmed
   * the timeout parameter indicates how many rounds do you wish to check pending transactions for
   */
  async waitForConfirmation(txId, timeout) {
    if (this.client == null || txId == null || timeout < 0) {
      throw new Error('Bad arguments.');
    }
    const status = await this.client.status().do();
    if (typeof status === 'undefined')
      throw new Error('Unable to get node status');
    const startround = status['last-round'] + 1;
    let currentround = startround;

    /* eslint-disable no-await-in-loop */
    while (currentround < startround + timeout) {
      const pendingInfo = await this.client.pendingTransactionInformation(txId).do()
      if (pendingInfo !== undefined) {
        if (
          pendingInfo['confirmed-round'] !== null &&
          pendingInfo['confirmed-round'] > 0
        ) {
          // Got the completed Transaction
          return pendingInfo;
        }

        if (
          pendingInfo['pool-error'] != null &&
          pendingInfo['pool-error'].length > 0
        ) {
          // If there was a pool error, then the transaction has been rejected!
          throw new Error(
            `Transaction Rejected pool error${pendingInfo['pool-error']}`
          );
        }
      }
      await this.client.statusAfterBlock(currentround).do();
      currentround += 1;
    }
    throw new Error(`Transaction not confirmed after ${timeout} rounds!`);
  }

  async verboseWaitForConfirmation(txnId) {
    console.log('Awaiting confirmation (this will take several seconds)...');
    const roundTimeout = 2;
    const completedTx = await this.waitForConfirmation(txnId, roundTimeout)
    console.log('Transaction successful.');
    return completedTx;
  }

  async sendTransaction(transaction, hotWallet) {
    await this.connect()

    // const chainTransaction = await this.chain.new.Transaction()

    // try {
      const txn = JSON.parse(transaction.txRaw || "{}")
      const suggestedParams = await this.client.getTransactionParams().do()
      txn.suggestedParams = suggestedParams
      txn.appArgs[0] = this.hex2Uint(txn.appArgs[0])
      txn.appArgs[1] = this.hex2Uint(txn.appArgs[1])
      txn.accounts = txn.appAccounts

      console.log(txn)
      const txn2 = txn
      txn2.accounts = ["YFGM3UODOZVHSI4HXKPXOKFI6T2YCIK3HKWJYXYFQBONJD4D3HD2DPMYW4"]
      console.log(txn2)

      const transaction1 = algosdk.makeApplicationNoOpTxnFromObject(txn)
      const transaction2 = algosdk.makeApplicationNoOpTxnFromObject(txn2)

      algosdk.assignGroupID([transaction1, transaction2])
      console.log(transaction1);
      console.log(transaction2);
      const signedTx1 = transaction1.signTxn(this.hex2Uint(chainjs.HelpersAlgorand.toAlgorandPrivateKey(hotWallet.privateKey)))
      const signedTx2 = transaction2.signTxn(this.hex2Uint(chainjs.HelpersAlgorand.toAlgorandPrivateKey(hotWallet.privateKey)))

      // TODO: catch errors (400 - bad requests)
      const { txId: callTxnId } = await this.client.sendRawTransaction([signedTx1, signedTx2]).do()
      console.log(callTxnId);

      await this.verboseWaitForConfirmation(callTxnId)
      const tx_result = { transactionId: callTxnId }
      console.log(tx_result);

      console.log(`Transaction has successfully signed and sent by ${hotWallet.address} to blockchain tx hash: ${tx_result.transactionId}`)
      return tx_result
      // const action = await this.chain.composeAction(chainjs.ModelsAlgorand.AlgorandChainActionType.AppNoOp, txn)
      // chainTransaction.actions = [action]

      // const algoFee = await chainTransaction.getSuggestedFee(chainjs.Models.TxExecutionPriority.Fast)
      // // validate enough gas
      // if (new BigNumber(algoFee).isGreaterThan(await this.getAlgoBalanceForHotWallet(hotWallet.address))) {
      //   const errorMessage = `The Hot Wallet has insufficient algo to pay a fee. Please top up the ${hotWallet.address}`
      //   console.error(errorMessage)
      //   return { valid: false, markAs: "cancelled", error: errorMessage}
      // }

      // await chainTransaction.setDesiredFee(algoFee)
      // await chainTransaction.prepareToBeSigned()
      // await chainTransaction.validate()
      // await chainTransaction.sign([chainjs.HelpersAlgorand.toAlgorandPrivateKey(hotWallet.privateKey)])
      // const tx_result = await chainTransaction.send(chainjs.Models.ConfirmType.After001)

      // console.log(`Transaction has successfully signed and sent by ${hotWallet.address} to blockchain tx hash: ${tx_result.transactionId}`)
      // return tx_result
    // } catch (err) {
    //   console.error(err)
    //   return { valid: false, markAs: "failed", error: err.message }
    // }
  }

  async disableWallet(_withdrawalAddresses, _hotWallet) {
    console.error("Disable wallet for Algorand is not implemented")
  }
}
exports.AlgorandBlockchain = AlgorandBlockchain
