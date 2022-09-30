class AlgorandTxValidator {
 
  constructor(params){
    this.envs = params.envs,
    this.blockchain = params.blockchain
  }

  async isTransactionValid(blockchainTransaction, hotWalletAddress) {
    if (typeof blockchainTransaction.txRaw !== 'string') { return { valid: false } }

    try {
      const transaction = JSON.parse(blockchainTransaction.txRaw)

      // Is AppIndex for the current App?
      if (this.envs.optInApp && transaction.appIndex !== this.envs.optInApp) {
        const errorMessage = "The transaction is not for configured App."
        console.log(errorMessage)
        return { valid: false, markAs: "failed", error: errorMessage }
      }

      // Checks for transfer transaction
      const transferMethodId = "0x7472616e73666572"
      if (this.envs.optInApp && transaction.appArgs[0] === transferMethodId) {
        const txTokensAmount = parseInt(transaction.appArgs[1])

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
      return { valid: true }
    } catch (err) {
      console.error(err)
      return { valid: false, markAs: "failed", error: `Unknown error: ${err}` }
    }
  }
}

exports.AlgorandTxValidator = AlgorandTxValidator
