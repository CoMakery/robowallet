
const EthereumBlockchain = require('../lib/blockchains/EthereumBlockchain').EthereumBlockchain
const BigNumber = require('bignumber.js')

describe("EthereumBlockchain.disableWallet", () => {
  const hwAddress = '0x15b4eda54e7aa56e4ca4fe6c19f7bf9d82eca2fc'
  const ethContractAddress = "0x1d1592c28fff3d3e71b1d29e31147846026a0a37"
  const transactionHash = "0xb5c8bd9430b6cc87a0e2fe110ece6bf527fa4f170a4bc8cd032f768fc5219838"
  const ethBlockchain = new EthereumBlockchain({
    infuraProjectId: "infura_project_id",
    blockchainNetwork: 'ethereum_ropsten',
    ethereumContractAddress: ethContractAddress
  })

  let sendTransactionSpy = jest.spyOn(ethBlockchain, "sendTransaction")
  let getTokenBalanceSpy = jest.spyOn(ethBlockchain, "getTokenBalance")
  let getEthBalanceSpy = jest.spyOn(ethBlockchain, "getEthBalance")
  let getCurrentBaseFeeSpy = jest.spyOn(ethBlockchain, "getCurrentBaseFee")

  afterEach(() => {
    jest.resetAllMocks()
  })

  test('or empty disable values', async () => {
    const disableValues = {}

    const validResults = await ethBlockchain.disableWallet(disableValues, hwAddress)

    expect.assertions(1)
    expect(validResults).toEqual({ tokensWithdrawalTx: {}, coinsWithdrawalTx: {} })
  })

  test('for zero token balance and undefined coin address', async () => {
    const disableValues = {
      tokenAddress: hwAddress,
      tokenContract: ethContractAddress
    }
    getTokenBalanceSpy.mockReturnValueOnce({ balance: new BigNumber("0.0"), balanceInBaseUnit: new BigNumber("0") })

    const validResults = await ethBlockchain.disableWallet(disableValues, hwAddress)

    expect.assertions(3)
    expect(getTokenBalanceSpy).toHaveBeenCalledTimes(1)
    expect(sendTransactionSpy).toHaveBeenCalledTimes(0)
    expect(validResults).toEqual({ tokensWithdrawalTx: { status: "skipped", txHash: null, message: "Tokens balance is zero, transaction skipped" }, coinsWithdrawalTx: {} })
  })

  test('for zero token balance coins withdrawal executed', async () => {
    const disableValues = {
      tokenAddress: hwAddress,
      tokenContract: ethContractAddress,
      coinAddress: hwAddress
    }
    const sendTokensTxResult = { valid: true, transactionId: 1}

    ethBlockchain.envs.ethereumMaxPriorityFeePerGas = '4'

    getEthBalanceSpy.mockReturnValueOnce(new BigNumber(0.03))
    sendTransactionSpy.mockReturnValueOnce(sendTokensTxResult)
    getTokenBalanceSpy.mockReturnValueOnce({ balance: new BigNumber("0.0"), balanceInBaseUnit: new BigNumber("0") })
    getCurrentBaseFeeSpy.mockReturnValueOnce(100)

    const validResults = await ethBlockchain.disableWallet(disableValues, hwAddress)

    expect.assertions(4)
    expect(getTokenBalanceSpy).toHaveBeenCalledTimes(1)
    expect(sendTransactionSpy).toHaveBeenCalledTimes(1)
    expect(getEthBalanceSpy).toHaveBeenCalledTimes(1)
    expect(validResults).toEqual({
      tokensWithdrawalTx: { status: "skipped", txHash: null, message: "Tokens balance is zero, transaction skipped" },
      coinsWithdrawalTx:  {
        status: "success",
        txHash: sendTokensTxResult.transactionId,
        message: `Successfully sent Tx id: ${sendTokensTxResult.transactionId}`} })
  })

  test('for error during token transfer', async () => {
    const disableValues = {
      tokenAddress: hwAddress,
      tokenContract: ethContractAddress,
      coinAddress: hwAddress
    }
    const sendTokensTxResult = { valid: false, markAs: "failed", error: "Error during withdraw tokens tx" }
    const sendCoinsTxResult = {}
    const sendTxResult = {
      tokensWithdrawalTx: {
        message: sendTokensTxResult.error,
        status: sendTokensTxResult.markAs,
        txHash: null
      },
      coinsWithdrawalTx: sendCoinsTxResult
    }

    getTokenBalanceSpy.mockReturnValueOnce({ balance: new BigNumber("1.0"), balanceInBaseUnit: new BigNumber("1000000") })
    sendTransactionSpy.mockReturnValueOnce(sendTokensTxResult)
    getEthBalanceSpy.mockReturnValueOnce(new BigNumber(0))

    const validResults = await ethBlockchain.disableWallet(disableValues, hwAddress)

    expect.assertions(3)
    expect(getTokenBalanceSpy).toHaveBeenCalledTimes(1)
    expect(sendTransactionSpy).toHaveBeenCalledTimes(1)
    expect(validResults).toEqual(sendTxResult)
  })

  test('for coin balance is less than minimum allowed', async () => {
    const disableValues = {
      tokenAddress: hwAddress,
      tokenContract: ethContractAddress,
      coinAddress: hwAddress
    }

    const sendTokensTxResult = { status: "success", txHash: transactionHash, message: `Successfully sent Tx id: ${transactionHash}` }
    const sendCoinsTxResult = { status: "skipped", txHash: null, message: `ETH balance is <= ${EthereumBlockchain.getMinimumCoinBalanceWithdrawal()}, transaction skipped` }
    const sendTxResult = {
      tokensWithdrawalTx: sendTokensTxResult,
      coinsWithdrawalTx: sendCoinsTxResult
    }

    getTokenBalanceSpy.mockReturnValueOnce({ balance: new BigNumber("1.0"), balanceInBaseUnit: new BigNumber("1000000") })
    sendTransactionSpy.mockReturnValueOnce({ transactionId: transactionHash })
    getEthBalanceSpy.mockReturnValueOnce(new BigNumber(EthereumBlockchain.getMinimumCoinBalanceWithdrawal()))

    const validResults = await ethBlockchain.disableWallet(disableValues, hwAddress)

    expect.assertions(3)
    expect(getTokenBalanceSpy).toHaveBeenCalledTimes(1)
    expect(sendTransactionSpy).toHaveBeenCalledTimes(1)
    expect(validResults).toEqual(sendTxResult)
  })

  test('for error on coin transaction', async () => {
    const disableValues = {
      tokenAddress: hwAddress,
      tokenContract: ethContractAddress,
      coinAddress: hwAddress
    }

    const sendTokensTxResult = { status: "success", txHash: transactionHash, message: `Successfully sent Tx id: ${transactionHash}` }
    const sendCoinsTxResult = { status: "failed", txHash: null, message: `Error during withdraw ETH tx` }
    const sendTxResult = {
      tokensWithdrawalTx: sendTokensTxResult,
      coinsWithdrawalTx: sendCoinsTxResult
    }

    ethBlockchain.envs.ethereumMaxPriorityFeePerGas = '4'

    getTokenBalanceSpy.mockReturnValueOnce({ balance: new BigNumber("1.0"), balanceInBaseUnit: new BigNumber("1000000") })
    sendTransactionSpy.mockReturnValueOnce({ transactionId: transactionHash })
    sendTransactionSpy.mockReturnValueOnce({ valid: false, markAs: "failed", error: "Error during withdraw ETH tx" })
    getEthBalanceSpy.mockReturnValueOnce(new BigNumber("0.03"))
    getCurrentBaseFeeSpy.mockReturnValueOnce(100)

    const validResults = await ethBlockchain.disableWallet(disableValues, hwAddress)

    expect.assertions(3)
    expect(getTokenBalanceSpy).toHaveBeenCalledTimes(1)
    expect(sendTransactionSpy).toHaveBeenCalledTimes(2)
    expect(validResults).toEqual(sendTxResult)
  })
});
