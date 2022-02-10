const Web3 = require('@solana/web3.js')

class SolanaHotWallet {
  constructor(network, address, keys, _options = {}) {
    this.network = network
    this.address = address
    this.privateKey = keys.privateKey
    this.publicKey = keys.publicKey
    this.privateKeyEncrypted = ''

    const uintPrivateKey = Uint8Array.from(Buffer.from(this.privateKey, 'hex'))
    this.keyPair = Web3.Keypair.fromSecretKey(uintPrivateKey)
    this.solanaPublicKey = this.keyPair.publicKey
    this.solanaPrivateKey = this.keyPair.secretKey
  }

  isReadyToSendTx(_envs) {
    return true
  }
}

exports.SolanaHotWallet = SolanaHotWallet
