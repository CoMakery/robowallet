class SolanaHotWallet {
  constructor(network, address, keys, _options = {}) {
    this.network = network
    this.address = address
    this.privateKey = keys.privateKey
    this.publicKey = keys.publicKey
  }

  isReadyToSendTx(_envs) {
    return true
  }
}

exports.SolanaHotWallet = SolanaHotWallet
