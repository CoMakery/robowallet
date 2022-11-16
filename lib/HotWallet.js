const AlgorandHotWallet = require("./AlgorandHotWallet").AlgorandHotWallet
const EthereumHotWallet = require("./EthereumHotWallet").EthereumHotWallet
const SolanaHotWallet = require("./SolanaHotWallet").SolanaHotWallet

class HotWallet {
  constructor(network, address, keys, options = {}) {
    if (["algorand", "algorand_test", "algorand_beta"].includes(network)) {
      this.klass = new AlgorandHotWallet(network, address, keys, options)
    } else if (["ethereum", "ethereum_ropsten", "ethereum_rinkeby"].includes(network)) {
      this.klass = new EthereumHotWallet(network, address, keys, options)
    } else if (["solana", "solana_devnet"].includes(network)) {
      this.klass = new SolanaHotWallet(network, address, keys, options)
    } else {
      this.klass = undefined
    }

    this.address = this.klass.address
    this.publicKey = this.klass.publicKey
    this.privateKey = this.klass.privateKey
    this.privateKeyEncrypted = this.klass.privateKeyEncrypted
  }

  isReadyToSendTx(envs) {
    return this.klass.isReadyToSendTx(envs)
  }

  isEthereum() {
    return this.klass.constructor.name === "EthereumHotWallet"
  }

  isAlgorand() {
    return this.klass.constructor.name === "AlgorandHotWallet"
  }

  isSolana() {
    return this.klass.constructor.name === "SolanaHotWallet"
  }
}
exports.HotWallet = HotWallet
