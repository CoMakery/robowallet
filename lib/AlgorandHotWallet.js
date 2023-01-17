class AlgorandHotWallet {
  constructor(network, address, keys, options = {}) {
    this.network = network
    this.address = address
    this.privateKey = keys.privateKey
    this.publicKey = keys.publicKey
    this.privateKeyEncrypted = ''
    this.optedInApps = options.optedInApps || []
    this.algoPrivateKey = Uint8Array.from(Buffer.from(this.privateKey, 'hex'))

  }

  isReadyToSendTx(envs) {
    return this.isOptedInToApp(envs.optInApp)
  }

  isOptedInToApp(appIndexToCheck) {
    if (!this.optedInApps) { return false }
    return this.optedInApps.includes(appIndexToCheck)
  }

  secretKey() {
    this.keys.privateKey
  }
}
exports.AlgorandHotWallet = AlgorandHotWallet
