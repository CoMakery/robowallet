const AlgorandBlockchain = require("./blockchains/AlgorandBlockchain").AlgorandBlockchain
const EthereumBlockchain = require("./blockchains/EthereumBlockchain").EthereumBlockchain
const SolanaBlockchain = require("./blockchains/SolanaBlockchain").SolanaBlockchain

class Blockchain {
  constructor(envs) {
    this.envs = envs
    this.blockchainNetwork = envs.blockchainNetwork
    if (["algorand", "algorand_test", "algorand_beta"].includes(this.blockchainNetwork)) {
      this.klass = new AlgorandBlockchain(this.envs)
    } else if (["ethereum", "ethereum_sepolia", "ethereum_goerli"].includes(this.blockchainNetwork)) {
      this.klass = new EthereumBlockchain(this.envs)
    } else if (["solana", "solana_devnet"].includes(this.blockchainNetwork)) {
      this.klass = new SolanaBlockchain(this.envs)
    } else {
      this.klass = undefined
    }
  }

  async generateNewWallet() {
    return await this.klass.generateNewWallet()
  }

  async enoughCoinBalanceToSendTransaction(hotWalletAddress) {
    return await this.klass.enoughCoinBalanceToSendTransaction(hotWalletAddress)
  }

  async isTransactionValid(transaction, hotWalletAddress) {
    return await this.klass.isTransactionValid(transaction, hotWalletAddress)
  }

  async sendTransaction(transaction, hotWallet) {
    return await this.klass.sendTransaction(transaction, hotWallet)
  }

  async disableWallet(disableValues, hotWallet) {
    return await this.klass.disableWallet(disableValues, hotWallet)
  }
}
exports.Blockchain = Blockchain
exports.AlgorandBlockchain = AlgorandBlockchain
exports.EthereumBlockchain = EthereumBlockchain
