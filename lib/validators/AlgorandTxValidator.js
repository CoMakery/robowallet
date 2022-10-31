const BigNumber = require('bignumber.js')

class AlgorandTxValidator {
  constructor(params){
    this.envs = params.envs,
    this.blockchain = params.blockchain
    this.skipAppIndexTypes = ['FundOptIn']
    this.valid = false
    this.markAs = null
    this.error = null
  }

  async isTransactionValid(blockchainTransaction, hotWalletAddress) {
    if (typeof blockchainTransaction.txRaw !== 'string') { return { valid: false } }
    const { txRaw, blockchainTransactableType, blockchainTransactables } = blockchainTransaction
    try {
      const transaction = JSON.parse(blockchainTransaction.txRaw)
      const transactableType = blockchainTransactableType || blockchainTransactables[0].blockchainTransactableType
      const isAmountValid = await this.isAmountValid({ transaction, transactableType, hotWalletAddress })
      const isAppIndexValid = this.isAppIndexValid(transaction, transactableType)

      if (isAmountValid && isAppIndexValid) {
        return { valid: true }
      } else {
        return { valid: false, markAs: this.markAs, error: this.error }
      }
    } catch (err) {
      console.error(err)
      return { valid: false, markAs: "failed", error: `Unknown error: ${err}` }
    }
  }

  // Is AppIndex for the current App?
  isAppIndexValid(transaction, transactableType) {
    if (!this.envs.optInApp || this.skipAppIndexTypes.includes(transactableType) ||
      this.envs.optInApp && transaction.appIndex === this.envs.optInApp ) {
        return true
    } else {
      this.markAs = "failed"
      this.error = "The transaction is not for configured App."
      return false
    }
  }

  async isAmountValid({ transaction, transactableType, hotWalletAddress }) {
    let isValid = true
    const transferMethodId = "0x7472616e73666572"
    if (this.envs.optInApp && transaction.appArgs?.[0] === transferMethodId) {
      const txTokensAmount = parseInt(transaction.appArgs[1])
      isValid = await this.isMaxAmountNotExceeded(txTokensAmount) &&
        await this.isTokenBalanceEnough({ txTokensAmount, hotWalletAddress })
    } else if (transactableType === 'FundOptIn') {
      const txCoinsAmount = parseInt(transaction.amount)
      isValid = await this.isCoinsBalanceEnough({ txCoinsAmount, hotWalletAddress })
    }
    return isValid
  }

  async isMaxAmountNotExceeded(txTokensAmount) {
    if (!this.envs.maxAmountForTransfer || txTokensAmount <= this.envs.maxAmountForTransfer) {
      return true
    } else {
      const errorMessage = `The transaction's transfer is too large (${txTokensAmount}). Max amount is ${this.envs.maxAmountForTransfer}`
      console.log(errorMessage)
      this.markAs = "failed"
      this.error = errorMessage
      return false
    }
  }

  async isTokenBalanceEnough({ txTokensAmount, hotWalletAddress }) {
    const hwTokensBalance = await this.blockchain.getTokenBalance(hotWalletAddress)

    if (hwTokensBalance >= txTokensAmount) {
      return true
    } else {
      const errorMessage = `The Hot Wallet has insufficient tokens to transfer (${hwTokensBalance} < ${txTokensAmount})`
      console.log(errorMessage)
      this.markAs = "cancelled"
      this.error = errorMessage
      return false
    }
  }

  async isCoinsBalanceEnough({ txCoinsAmount, hotWalletAddress }) {
    const hwCoinsBalance = await this.blockchain.getAlgoBalanceForHotWallet(hotWalletAddress)
    const txAmount = new BigNumber(txCoinsAmount).dividedBy(1000000)

    if (txAmount.isLessThanOrEqualTo(hwCoinsBalance)) {
      return true
    } else {
      const errorMessage = `The Hot Wallet has insufficient coins to transfer (${hwCoinsBalance} < ${txAmount})`
      console.log(errorMessage)
      this.markAs = "cancelled"
      this.error = errorMessage
      return false
    }
  }
}

exports.AlgorandTxValidator = AlgorandTxValidator
