const BigNumber = require('bignumber.js')
const JSONbig = require("json-bigint")


class SolanaTxValidator {

  constructor(params) {
    this.web3 = params.web3
    this.blockchain = params.blockchain
  }

  async isSystemTxValid(blockchainTransaction, txn, hotWalletAddress) {
    const amountInBaseUnit = new BigNumber(blockchainTransaction.amount)

    if (!amountInBaseUnit.isEqualTo(txn.amount)) {
      const errorMessage = `Incorrect arguments. Total amount is not equal to transaction amount`
      console.log(errorMessage)
      return { valid: false, markAs: "cancelled", error: errorMessage, switchHWToManualMode: true }
    }

    if (amountInBaseUnit.isGreaterThanOrEqualTo(new BigNumber(this.blockchain.getMinimumSolTransferAmount()))) {
      const lamportsBalance = await this.blockchain.getSolBalance(hotWalletAddress)
      const blockHash = await this.web3.getRecentBlockhash()
      const fee = BigNumber(blockHash.feeCalculator.lamportsPerSignature)

      // validate enough SOL to pay tx fee and amount transfer
      if (lamportsBalance.lamports.isLessThan(amountInBaseUnit.plus(fee))) {
        const errorMessage = `The Robo Wallet has insufficient SOL balance. Please top up the ${hotWalletAddress}`
        console.log(errorMessage)
        return { valid: false, markAs: "cancelled", error: errorMessage, switchHWToManualMode: true }
      }
    } else {
      const errorMessage = `Transfer amount ${amountInBaseUnit} is less then minimum  ${this.blockchain.getMinimumSolTransferAmount()}`
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
      if (blockchainTransaction.blockchainTransactables.length == 0) {
        const errorMessage = `Empty transactables`
        console.log(errorMessage)
        return { valid: false, markAs: "cancelled", error: errorMessage, switchHWToManualMode: true }
      }

      const txn = JSONbig.parse(blockchainTransaction.txRaw || "{}")
      let result = { valid: false }

      switch (txn.type) {
        case "Blockchain::Solana::Tx::SystemProgram::Transfer": // SOL transfer
          result = await this.isSystemTxValid(blockchainTransaction, txn, hotWalletAddress)
          return result
        case "Blockchain::Solana::Tx::Spl::Transfer":
        case 'Blockchain::Solana::Tx::SplLockup::FundReleaseSchedule':
          result = this.isSplTxValid(blockchainTransaction, txn)
          if (!result.valid) {
            return result
          }
          break
        case "Blockchain::Solana::Tx::Spl::BatchTransfer":
        case 'Blockchain::Solana::Tx::SplLockup::BatchFundReleaseSchedule':
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
        const tokenBalance = await this.blockchain.getTokenBalance(hotWalletAddress, blockchainTransaction.contractAddress) // is it possible that contractAddress != tx.mintAddress

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

}


exports.SolanaTxValidator = SolanaTxValidator
