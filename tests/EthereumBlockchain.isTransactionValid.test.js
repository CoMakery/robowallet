
const EthereumBlockchain = require('../lib/blockchains/EthereumBlockchain').EthereumBlockchain
const BigNumber = require('bignumber.js')
const blockchainTransaction = require('./fixtures/ethereumBlockchainTransaction').blockchainTransaction

describe("EthereumBlockchain.isTransactionValid", () => {
  const hwAddress = '0x15b4eda54e7aa56e4ca4fe6c19f7bf9d82eca2fc'
  const ethBlockchain = new EthereumBlockchain({
    infuraProjectId: "infura_project_id",
    blockchainNetwork: 'ethereum_ropsten',
    ethereumContractAddress: "0x1d1592c28fff3d3e71b1d29e31147846026a0a37"
  })

  test('for valid blockchainTransaction', async () => {
    jest.spyOn(ethBlockchain, "getTokenBalance").mockReturnValueOnce({ balance: new BigNumber("0.000000001"), balanceInBaseUnit: new BigNumber("10") })

    const validResults = await ethBlockchain.isTransactionValid(blockchainTransaction, hwAddress)
    expect(validResults.valid).toBe(true)
    expect(validResults.markAs).toBe(undefined)
    expect(validResults.error).toBe(undefined)
    expect(validResults.switchHWToManualMode).toBe(undefined)
  })

  test('for incorrect txRaw', async () => {
    const bt = {...blockchainTransaction}
    bt["txRaw"] = null

    const validResults = await ethBlockchain.isTransactionValid(bt, hwAddress)
    expect(validResults.valid).toBe(false)
    expect(validResults.markAs).toBe(undefined)
    expect(validResults.error).toBe(undefined)
    expect(validResults.switchHWToManualMode).toBe(undefined)
  })

  test('for not enough tokens', async () => {
    jest.spyOn(ethBlockchain, "getTokenBalance").mockReturnValueOnce({ balance: new BigNumber("0.0000000004"), balanceInBaseUnit: new BigNumber("4") })

    const validResults = await ethBlockchain.isTransactionValid(blockchainTransaction, hwAddress)
    expect(validResults.valid).toBe(false)
    expect(validResults.markAs).toBe("cancelled")
    expect(validResults.error).toEqual("The Hot Wallet has insufficient tokens. Please top up the 0x15b4eda54e7aa56e4ca4fe6c19f7bf9d82eca2fc")
    expect(validResults.switchHWToManualMode).toBe(true)
  })

  test('for unknown error', async () => {
    jest.spyOn(ethBlockchain, "getTokenBalance").mockReturnValueOnce({})

    const validResults = await ethBlockchain.isTransactionValid(blockchainTransaction, hwAddress)
    expect(validResults.valid).toBe(false)
    expect(validResults.markAs).toBe("failed")
    expect(validResults.error).toEqual("Unknown error: TypeError: Cannot read property 'isLessThan' of undefined")
    expect(validResults.switchHWToManualMode).toBe(true)
  })
});
