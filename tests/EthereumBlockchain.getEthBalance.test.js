const EthereumBlockchain = require('../lib/blockchains/EthereumBlockchain').EthereumBlockchain
const BigNumber = require('bignumber.js')

describe("EthereumBlockchain check for eth balance", () => {
  test('return balance as a BigNumber object', async () => {
    const ethBlockchain = new EthereumBlockchain({
      alchemyApiKey: "39f6ad316c5a4b87a0f90956333c3666",
      blockchainNetwork: 'ethereum_sepolia'
    })

    jest.spyOn(ethBlockchain.web3.eth, "getBalance").mockImplementation(() => { return "995" });

    const balance = await ethBlockchain.getEthBalance("0x2aA78Db0BEff941883C33EA150ed86eaDE09A377")
    expect(balance).toEqual(new BigNumber("995"))
  })

  test('return zero if undefined', async () => {
    const ethBlockchain = new EthereumBlockchain({
      alchemyApiKey: "39f6ad316c5a4b87a0f90956333c3666",
      blockchainNetwork: 'ethereum_sepolia'
    })

    jest.spyOn(ethBlockchain.web3.eth, "getBalance").mockImplementation(() => { return undefined });

    const balance = await ethBlockchain.getEthBalance("0x2aA78Db0BEff941883C33EA150ed86eaDE09A377")
    expect(balance).toEqual(new BigNumber(0))
  })
});
