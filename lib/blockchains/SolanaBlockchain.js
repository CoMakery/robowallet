
const BigNumber = require('bignumber.js')
const HotWallet = require("../HotWallet").HotWallet
const Web3 = require('@solana/web3.js')
const JSONbig = require("json-bigint")

class SolanaBlockchain {
  constructor(envs) {
    this.envs = envs
    this.blockchainNetwork = envs.blockchainNetwork
    const endpoint = this.endpointsByNetwork(this.blockchainNetwork)
    this.web3 = new Web3.Connection(endpoint, 'confirmed')
  }

  mainnetEndpoints() {
    return `https://solana--mainnet.datahub.figment.io/apikey/${this.envs.figmentApiKey}`
  }

  devnetEndpoints() {
    return `https://solana--devnet.datahub.figment.io/apikey/${this.envs.figmentApiKey}`
  }

  testnetEndpoints() {
    return `https://solana--testnet.datahub.figment.io/apikey/${this.envs.figmentApiKey}`
  }

  endpointsByNetwork(network) {
    switch (network) {
      case 'solana':
        return this.mainnetEndpoints()
      case 'solana_devnet':
        return this.devnetEndpoints()
      case 'solana_testnet':
        return this.testnetEndpoints()
      default:
        console.error("Unknown or unsupported network")
    }
  }

  connectionConfig() {
    return {
      commitment: 'finalized',
      disableRetryOnRateLimit: false,
    }
  }

  withdrawTokensTx(hotWalletAddress, contractAddress, withdrawalAddress, tokensAmount) {
    return {
      network: this.blockchainNetwork,
      txRaw: JSON.stringify({
        type: "Blockchain::Solana::Tx::Spl::Transfer",
        from: hotWalletAddress,
        to: withdrawalAddress,
        amount: tokensAmount,
        tokenMintAddress: contractAddress,
      })
    }
  }

  withdrawCoinsTx(hotWalletAddress, withdrawalAddress, coinsAmount) {
    return {
      network: this.blockchainNetwork,
      txRaw: JSON.stringify({
        type: "Blockchain::Solana::Tx::SystemProgram::Transfer",
        from: hotWalletAddress,
        to: withdrawalAddress,
        amount: coinsAmount,
      })
    }
  }

  async generateNewWallet() {
    let newWallet
    let address = ''

    // Sometimes it generates invalid 43 letters address for some reason
    while (address.length != 44) {
      newWallet = Web3.Keypair.generate()
      address = newWallet.publicKey.toString()
    }
    const privateKey = Buffer.from(newWallet.secretKey).toString('hex')
    const keys = { publicKey: address, privateKey: privateKey }

    return new HotWallet(this.blockchainNetwork, address, keys)
  }

  async getSolBalance(hotWalletAddress) {
    const publickKey = new Web3.PublicKey(hotWalletAddress)
    const lamportsBalanceResponse = await this.web3.getBalance(publickKey)
    const lamportsBalance = new BigNumber(lamportsBalanceResponse)
    const balances = { lamports: new BigNumber(0), sol: new BigNumber(0) }

    if (lamportsBalance.isGreaterThan(BigNumber(0))) {
      balances['lamports'] = lamportsBalance
      balances['sol'] = lamportsBalance.div(BigNumber(Web3.LAMPORTS_PER_SOL))
    }
    return balances
  }

  async enoughCoinBalanceToSendTransaction(hotWalletAddress) {
    const blockHash = await this.web3.getRecentBlockhash()
    const fee = BigNumber(blockHash.feeCalculator.lamportsPerSignature)

    const lamports = (await this.getSolBalance(hotWalletAddress)).lamports
    return lamports.isGreaterThan(fee)
  }

  async getTokenBalance(hotWalletAddress, tokenAddress) {
    const walletPubKey = new Web3.PublicKey(hotWalletAddress)
    const tokenPubKey = new Web3.PublicKey(tokenAddress)
    const balances = { balance: new BigNumber(0), balanceInBaseUnit: new BigNumber(0) }

    try {
      const tokenAccountsResponse = await this.web3.getTokenAccountsByOwner(
        walletPubKey,
        { mint: tokenPubKey }
      )

      if (tokenAccountsResponse.value.length) {
        const calcBalancePromises = tokenAccountsResponse.value.map((async (tokenAccount) => {
          const balanceResponse = await this.web3.getTokenAccountBalance(tokenAccount.pubkey)
          const uiAmount = new BigNumber(balanceResponse.value.uiAmount)
          const baseAmount = new BigNumber(balanceResponse.value.amount)

          balances["balance"] = balances["balance"].plus(uiAmount)
          balances["balanceInBaseUnit"] = balances["balanceInBaseUnit"].plus(baseAmount)
        }).bind(this))
        await Promise.all(calcBalancePromises);
      }

      return balances
    } catch (err) {
      console.error(err.message)
      console.error(err.stack)
      return balances
    }
  }

  async isSystemTxValid(blockchainTransaction, txn, hotWalletAddress) {
    const amountInBaseUnit = new BigNumber(blockchainTransaction.amount)

    if (!amountInBaseUnit.isEqualTo(txn.amount)) {
      const errorMessage = `Incorrect arguments. Total amount is not equal to transaction amount`
      console.log(errorMessage)
      return { valid: false, markAs: "cancelled", error: errorMessage, switchHWToManualMode: true }
    }

    if (amountInBaseUnit.isGreaterThanOrEqualTo(new BigNumber(SolanaBlockchain.getMinimumSolTransferAmount()))) {
      const lamportsBalance = await this.getSolBalance(hotWalletAddress)
      const blockHash = await this.web3.getRecentBlockhash()
      const fee = BigNumber(blockHash.feeCalculator.lamportsPerSignature)

      // validate enough SOL to pay tx fee and amount transfer
      if (lamportsBalance.lamports.isLessThan(amountInBaseUnit.plus(fee))) {
        const errorMessage = `The Robo Wallet has insufficient SOL balance. Please top up the ${hotWalletAddress}`
        console.log(errorMessage)
        return { valid: false, markAs: "cancelled", error: errorMessage, switchHWToManualMode: true }
      }
    } else {
      const errorMessage = `Transfer amount ${amountInBaseUnit} is less then minimum  ${SolanaBlockchain.getMinimumSolTransferAmount()}`
      console.log(errorMessage)
      return { valid: false, markAs: "cancelled", error: errorMessage, switchHWToManualMode: true }
    }

    return { valid: true }
  }

  isSplTxValid(blockchainTransaction, txn) {
    const amountInBaseUnit = new BigNumber(blockchainTransaction.amount)

    if (!amountInBaseUnit.isEqualTo(txn.amount)) {
      const errorMessage = `Incorrect arguments. Total amount is not equal to transaction amount`
      console.log(errorMessage)
      return { valid: false, markAs: "cancelled", error: errorMessage, switchHWToManualMode: true }
    }

    return { valid: true }
  }

  isSplTxBatchValid(blockchainTransaction, txn) {
    const amountInBaseUnit = new BigNumber(blockchainTransaction.amount)

    // validate that tx tables size equals to tx count in order to be able to cancel dublicate transaction
    if ((!Array.isArray(blockchainTransaction.blockchainTransactables) ||
      !Array.isArray(txn.amount) || !Array.isArray(txn.to) ||
      blockchainTransaction.blockchainTransactables.length != txn.amount.length &&
      blockchainTransaction.blockchainTransactables.length != txn.to.length)) {
      const errorMessage = `Incorrect arguments. Please recreate batch and try again`
      console.log(errorMessage)
      return { valid: false, markAs: "cancelled", error: errorMessage, switchHWToManualMode: true }
    }

    // validate that total amount == sum of tx amounts
    if (!amountInBaseUnit.isEqualTo(BigNumber.sum.apply(null, txn.amount))) {
      const errorMessage = `Incorrect arguments. Total amount is not equal to transactions sum`
      console.log(errorMessage)
      return { valid: false, markAs: "cancelled", error: errorMessage, switchHWToManualMode: true }
    }

    return { valid: true }
  }

  async isTransactionValid(blockchainTransaction, hotWalletAddress) {
    if (typeof blockchainTransaction.txRaw !== 'string') { return { valid: false } }

    try {
      const txn = JSONbig.parse(blockchainTransaction.txRaw || "{}")
      let result = { valid: false }

      switch (txn.type) {
        case "Blockchain::Solana::Tx::SystemProgram::Transfer": // SOL transfer
          result = await this.isSystemTxValid(blockchainTransaction, txn, hotWalletAddress)
          return result
        case "Blockchain::Solana::Tx::Spl::Transfer":
          result = this.isSplTxValid(blockchainTransaction, txn)
          if (!result.valid) {
            return result
          }
          break
        case "Blockchain::Solana::Tx::Spl::BatchTransfer":
          result = this.isSplTxBatchValid(blockchainTransaction, txn)
          if (!result.valid) {
            return result
          }
          break
        default:
          const errorMessage = `The Robo Wallet doesn't support transaction type: ${txn.type}`
          console.log(errorMessage)
          return { valid: false, markAs: "cancelled", error: errorMessage, switchHWToManualMode: true }
      }
      // Token transfers (SPL or contracts)
      if (blockchainTransaction.contractAddress != txn.tokenMintAddress) {
        const errorMessage = `The Robo Wallet requires equal address for SPL transfers. Please check ${blockchainTransaction.contractAddress}, ${txn.tokenMintAddress}`
        console.log(errorMessage)
        return { valid: false, markAs: "cancelled", error: errorMessage, switchHWToManualMode: true }
      }
      const amountInBaseUnit = new BigNumber(blockchainTransaction.amount)

      // validate enough tokens
      if (amountInBaseUnit.isGreaterThan(new BigNumber(0))) {
        const tokenBalance = await this.getTokenBalance(hotWalletAddress, blockchainTransaction.contractAddress) // is it possible that contractAddress != tx.mintAddress

        if (tokenBalance.balanceInBaseUnit.isLessThan(amountInBaseUnit)) {
          const errorMessage = `The Robo Wallet has insufficient tokens. Please top up the ${hotWalletAddress}`
          console.log(errorMessage)
          return { valid: false, markAs: "cancelled", error: errorMessage, switchHWToManualMode: true }
        }
      }

      return { valid: true }
    } catch (err) {
      console.error(err.message)
      console.error(err.stack)
      return { valid: false, markAs: "failed", error: `Unknown error: ${err}`, switchHWToManualMode: true }
    }
  }

  async sendTransaction(blockchainTransaction, hotWallet) {
    const SolanaTxHelper = (await import('../SolanaTxHelper.mjs')).default // Dynamic import
    const txn = JSONbig.parse(blockchainTransaction.txRaw || "{}")
    const helper = new SolanaTxHelper(blockchainTransaction.network)
    let result = { valid: false, markAs: "failed", error: "General error" }

    let signature
    try {
      const transaction = await helper.create(txn)
      if (transaction) {
        signature = await this.web3.sendTransaction(transaction, [hotWallet.klass.keyPair])
        console.log("Submitted transaction " + signature + ", awaiting confirmation")

        await this.web3.confirmTransaction(signature)
        console.log("Transaction " + signature + " confirmed")

        return { transactionId: signature, valid: true }
      } else {
        console.error("Cannot create transaction")
        return { valid: false, markAs: "failed", error: "Cannot create transaction" }
      }
    } catch (err) {
      console.error("Something went wrong during transaction transfer")
      console.error(err)
      console.error(err.stack)
      result = { valid: false, markAs: "failed", error: err.message }
    }

    try {
      if (signature) {
        result.transactionId = signature
        const confirmationStatuses = ['processed', 'confirmed', 'finalized']
        const resStatus = await this.web3.getSignatureStatuses([signature])
        const isTxAccepted = resStatus.value.some((value) => {
          return confirmationStatuses.some((status) => status === value.confirmationStatus)
        })

        if (isTxAccepted)
          return { transactionId: signature, valid: true }
        else
          return result
      }
    } catch (err) {
      console.error("Something went wrong during signature status check")
      console.error(err)
      console.error(err.stack)
    }

    return result
  }

  async disableWallet(disableValues, hotWallet) {
    const result = { tokensWithdrawalTx: {}, coinsWithdrawalTx: {} }

    if (disableValues.tokenAddress && disableValues.tokenContract) {
      const tokenBalance = await this.getTokenBalance(hotWallet.address, disableValues.tokenContract)

      if (tokenBalance.balanceInBaseUnit.isGreaterThan(new BigNumber(0))) {
        const tokensAmount = tokenBalance.balanceInBaseUnit
        const txObject = this.withdrawTokensTx(hotWallet.address, disableValues.tokenContract, disableValues.tokenAddress, tokensAmount)
        console.log(`Sending ${tokensAmount.toString()} tokens to ${disableValues.tokenAddress}`)

        const tx = await this.sendTransaction(txObject, hotWallet)
        if (typeof tx.valid !== 'undefined' && tx.valid) {
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

    if (disableValues.coinAddress && result.tokensWithdrawalTx.status !== "failed") {
      const coinBalance = await this.getSolBalance(hotWallet.address)

      const blockHash = await this.web3.getRecentBlockhash()
      const fee = BigNumber(blockHash.feeCalculator.lamportsPerSignature)

      if (coinBalance.lamports.isGreaterThan(fee)) {
        const coinsAmount = coinBalance.lamports.minus(fee)
        const txObject = this.withdrawCoinsTx(hotWallet.address, disableValues.coinAddress, coinsAmount)

        console.log(`Sending ${coinsAmount} lamports to ${disableValues.coinAddress}`)
        const tx = await this.sendTransaction(txObject, hotWallet)

        if (typeof tx.valid !== 'undefined' && tx.valid) {
          const msg = `Successfully sent Tx id: ${tx.transactionId}`
          console.log(msg)
          result.coinsWithdrawalTx = { status: "success", txHash: tx.transactionId, message: msg }
        } else {
          const msg = "Error during SOL withdraw tx"
          console.error(msg)
          result.coinsWithdrawalTx = { status: "failed", txHash: null, message: msg }
        }
      } else {
        result.coinsWithdrawalTx = { status: "skipped", txHash: null, message: "SOL balance is <= 0.001, transaction skipped" }
      }
    }

    return result
  }

  static getMinimumSolTransferAmount() {
    return 1
  }

}
exports.SolanaBlockchain = SolanaBlockchain
