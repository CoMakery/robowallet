const hwUtils = require('../lib/hotwalletUtils')

describe("Blockchain generate new wallet test suite", () => {
  test('return correct generated keys for algorand ', async () => {
    const algoBlockchain = new hwUtils.Blockchain({
      purestakeApi: "eE7U9NAUNh1VlvDyZARGP4F2CIZgBDDB5nhxAS3G",
      blockchainNetwork: 'algorand_test'
    })

    const keys = await algoBlockchain.generateNewWallet()
    expect(keys).toBeInstanceOf(hwUtils.HotWallet)
    expect(Object.keys(keys)).toEqual(["klass", "address", "publicKey", "privateKey", "privateKeyEncrypted"])
    expect(typeof keys.address).toBe("string")
    expect(keys.address.length).toBe(58)
    expect(typeof keys.publicKey).toBe("string")
    expect(typeof keys.privateKey).toBe("string")
    expect(typeof keys.privateKeyEncrypted).toBe("string")
  })

  test('return correct generated keys for ethereum ', async () => {
    const ethBlockchain = new hwUtils.Blockchain({
      infuraProjectId: "39f6ad316c5a4b87a0f90956333c3666",
      blockchainNetwork: 'ethereum_ropsten'
    })

    const keys = await ethBlockchain.generateNewWallet()
    expect(keys).toBeInstanceOf(hwUtils.HotWallet)
    expect(Object.keys(keys)).toEqual(["klass", "address", "publicKey", "privateKey", "privateKeyEncrypted"])
    expect(typeof keys.address).toBe("string")
    expect(keys.address.length).toBe(42)
    expect(typeof keys.publicKey).toBe("string")
    expect(typeof keys.privateKey).toBe("string")
    expect(typeof keys.privateKeyEncrypted).toBe("string")
  })
})

test('return correct generated keys for solana ', async () => {
  const solanaBlockchain = new hwUtils.Blockchain({
    figmentApiKey: 'figment_api',
    blockchainNetwork: 'solana_devnet'
  })

  const keys = await solanaBlockchain.generateNewWallet()
  expect(keys).toBeInstanceOf(hwUtils.HotWallet)
  expect(Object.keys(keys)).toEqual(["klass", "address", "publicKey", "privateKey", "privateKeyEncrypted"])
  expect(typeof keys.address).toBe("string")
  expect(keys.address.length).toBe(44)
  expect(typeof keys.publicKey).toBe("string")
  expect(typeof keys.privateKey).toBe("string")
  expect(keys.privateKey.length).toBe(128)
  expect(typeof keys.privateKeyEncrypted).toBe("string")
  expect(keys.privateKeyEncrypted.length).toBe(0)
})

