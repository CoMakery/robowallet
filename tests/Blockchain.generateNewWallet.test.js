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
    const ethBlockchain = new hwUtils.EthereumBlockchain({
      infuraProjectId: "39f6ad316c5a4b87a0f90956333c3666",
      blockchainNetwork: 'ethereum_ropsten'
    })
    const createAccount = {
      generateKeysIfNeeded: jest.fn(),
      accountName: '0x2aA78Db0BEff941883C33EA150ed86eaDE09A377',
      generatedKeys: {
        publicKey: "057bac3f6921e98a89a3bfe2b2ec138577da66ee58329b741e44de93431f8bde",
        privateKey: "fb2c017e4b6ab9c8c6cf7513223f5cd0b493c249a39a68cd29b26d37274bad29057bac3f6921e98a89a3bfe2b2ec138577da66ee58329b741e44de93431f8bde",
        privateKeyEncrypted: "Z6mKYt1ntc+s1xQkK4HYKZtUsK4Kdg18kOa2p2SL6H0Q4GO0pafso6fEEmQgDoiakzj3lfqp3s5/1kEjNZomWm1h8xdwbBHUT4rrrTfohjdPZAe5Fg1Sw/6hA+mm7dKN8eWzEFaNe7LIdFrzHD0bOz5OSif8+t3QGmQfrbVulRakLfBh5tc6MVOsAMAt57d6nXUhaQfwPtuDB41bPoMRmAYrwjKrTmiu"
      }
    }
    jest.spyOn(ethBlockchain, "connect").mockImplementation(() => { return true });
    jest.spyOn(ethBlockchain.chain.new, "CreateAccount").mockReturnValueOnce(createAccount)

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

