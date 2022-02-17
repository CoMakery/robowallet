const AlgorandTxValidator = require("./validators/AlgorandTxValidator.js").AlgorandTxValidator
const EthereumTxValidator = require("./validators/EthereumTxValidator").EthereumTxValidator
const SolanaTxValidator   = require("./validators/SolanaTxValidator").SolanaTxValidator

class TxValidator {
  constructor(params) {
    if (params.type === "algorand") {
      this.klass = new AlgorandTxValidator(params)
    } else if (params.type === "ethereum") {
      this.klass = new EthereumTxValidator(params)
    } else if (params.type === "solana") {
      this.klass = new SolanaTxValidator(params)
    } else {
      this.klass = undefined
    }
  }

  async isTransactionValid(transaction, hotWalletAddress) {
    return await this.klass.isTransactionValid(transaction, hotWalletAddress)
  }
}

exports.TxValidator = TxValidator
exports.AlgorandTxValidator = AlgorandTxValidator
exports.EthereumTxValidator = EthereumTxValidator
exports.SolanaTxValidator = SolanaTxValidator
