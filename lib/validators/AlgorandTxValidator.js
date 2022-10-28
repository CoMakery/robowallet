const BigNumber = require('bignumber.js')

class AlgorandTxValidator {
  constructor(params){
    this.envs = params.envs,
    this.blockchain = params.blockchain
    this.skipAppIndexTypes = ['FundOptIn']
  }

  async isTransactionValid(blockchainTransaction, hotWalletAddress) {
    if (typeof blockchainTransaction.txRaw !== 'string') { return { valid: false } }
    const { txRaw, blockchainTransactableType, blockchainTransactables } = blockchainTransaction
    try {
      const transaction = JSON.parse(blockchainTransaction.txRaw)
      const transactableType = blockchainTransactableType || blockchainTransactables[0].blockchainTransactableType
      const skipAppIndexCheck = this.skipAppIndexTypes.includes(transactableType)

      // Is AppIndex for the current App?
      if (!skipAppIndexCheck && this.envs.optInApp && transaction.appIndex !== this.envs.optInApp) {
        const errorMessage = "The transaction is not for configured App."
        console.log(errorMessage)
        return { valid: false, markAs: "failed", error: errorMessage }
      }

      // Checks for transfer transaction
      const transferMethodId = "0x7472616e73666572"
      if (this.envs.optInApp && transaction.appArgs?.[0] === transferMethodId) {
        const txTokensAmount = parseInt(transaction.appArgs[1])
        const errorResponse = await this.checkTokenBalance(txTokensAmount, hotWalletAddress)
        if (errorResponse) { return errorResponse }
      } else if (transactableType === 'FundOptIn') {
        const txCoinsAmount = parseInt(transaction.amount)
        const errorResponse = await this.checkCoinsBalance(txCoinsAmount, hotWalletAddress)
        if (errorResponse) { return errorResponse }
      }
      return { valid: true }
    } catch (err) {
      console.error(err)
      return { valid: false, markAs: "failed", error: `Unknown error: ${err}` }
    }
  }

  async checkTokenBalance(txTokensAmount, hotWalletAddress) {
    if (this.envs.maxAmountForTransfer > 0 && txTokensAmount > this.envs.maxAmountForTransfer) {
      const errorMessage = `The transaction has too big amount for transfer (${txTokensAmount}). Max amount is ${this.envs.maxAmountForTransfer}`
      console.log(errorMessage)
      return { valid: false, markAs: "failed", error: errorMessage }
    }

    const hwTokensBalance = await this.blockchain.getTokenBalance(hotWalletAddress)
    if (hwTokensBalance < txTokensAmount) {
      const errorMessage = `The Hot Wallet has insufficient tokens to transfer (${hwTokensBalance} < ${txTokensAmount})`
      console.log(errorMessage)
      return { valid: false, markAs: "cancelled", error: errorMessage }
    }
  }

  async checkCoinsBalance(txCoinsAmount, hotWalletAddress) {
    const hwCoinsBalance = await this.blockchain.getAlgoBalanceForHotWallet(hotWalletAddress)
    const txAmount = new BigNumber(txCoinsAmount).dividedBy(1000000)

    if (txAmount.isGreaterThan(hwCoinsBalance)) {
      const errorMessage = `The Hot Wallet has insufficient coins to transfer (${hwCoinsBalance} < ${txAmount})`
      console.log(errorMessage)
      return { valid: false, markAs: "cancelled", error: errorMessage }
    }
  }
}

exports.AlgorandTxValidator = AlgorandTxValidator
