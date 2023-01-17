
const AlgorandBlockchain = require('../lib/blockchains/AlgorandBlockchain').AlgorandBlockchain
const BigNumber = require('bignumber.js')

describe("EthereumBlockchain.disableWallet", () => {
  const hwAddress = "YFGM3UODOZVHSI4HXKPXOKFI6T2YCIK3HKWJYXYFQBONJD4D3HD2DPMYW4"
  let algorandBlockchain = null

  let sendTransactionSpy = null
  let getTokenBalanceSpy = null
  let isOptedInToCurrentAppSpy = null
  let getAlgoBalanceForHotWalletSpy = null
  let withdrawAppTokensTxSpy = null
  let clearAppTxSpy = null
  let sendWithdrawalCoinsTransactionSpy = null
  const transactionId = 1
  const txFee = 50000
  let doMock = null
  let algodClient = null

  beforeEach(() => {
    algorandBlockchain = new AlgorandBlockchain({
      purestakeApi: "purestake_id",
      blockchainNetwork: "algorand_test",
      optInApp: 13997710
    })
    doMock = jest.fn(() => {
      return {
        fee: txFee
      }
    })
    algodClient = {
      getTransactionParams: jest.fn(() => {
        return {
          do: doMock
        }
      })
    }
    algorandBlockchain.algodClient = algodClient
    sendTransactionSpy = jest.spyOn(algorandBlockchain, "sendTransaction")
    getTokenBalanceSpy = jest.spyOn(algorandBlockchain, "getTokenBalance")
    getAlgoBalanceForHotWalletSpy = jest.spyOn(algorandBlockchain, "getAlgoBalanceForHotWallet")
    withdrawAppTokensTxSpy = jest.spyOn(algorandBlockchain, "withdrawAppTokensTx")
    clearAppTxSpy = jest.spyOn(algorandBlockchain, "clearAppTx")
    sendWithdrawalCoinsTransactionSpy = jest.spyOn(algorandBlockchain, "sendWithdrawalCoinsTransaction")
    isOptedInToCurrentAppSpy = jest.spyOn(algorandBlockchain, "isOptedInToCurrentApp")
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  test('or empty disable values', async () => {
    const disableValues = {}

    const validResults = await algorandBlockchain.disableWallet(disableValues, hwAddress)

    expect.assertions(1)
    expect(validResults).toEqual({ tokensWithdrawalTx: {}, coinsWithdrawalTx: {} })
  })

  test('for zero token balance and undefined coin address and application', async () => {
    const disableValues = {
      tokenAddress: hwAddress,
    }
    algorandBlockchain = new AlgorandBlockchain({
      purestakeApi: "purestake_id",
      blockchainNetwork: 'algorand_test'
    })
    getTokenBalanceSpy = jest.spyOn(algorandBlockchain, "getTokenBalance")
    getTokenBalanceSpy.mockReturnValueOnce(new BigNumber("0"))
    sendTransactionSpy.mockReturnValueOnce({ valid: true, transactionId: transactionId })

    const validResults = await algorandBlockchain.disableWallet(disableValues, hwAddress)

    expect.assertions(4)
    expect(getTokenBalanceSpy).toHaveBeenCalledTimes(1)
    expect(sendTransactionSpy).toHaveBeenCalledTimes(0)
    expect(clearAppTxSpy).toHaveBeenCalledTimes(0)

    expect(validResults).toEqual({
      tokensWithdrawalTx: { status: "skipped", txHash: null, message: "Tokens balance is zero, transaction skipped" },
      clearAppTx: { status: "skipped", txHash: null, message: "OptInApp is not defined, transaction skipped" },
      coinsWithdrawalTx: {}
    })
  })

  test('for zero token balance and succesful clear app and undefined coin address', async () => {
    const disableValues = {
      tokenAddress: hwAddress,
    }
    getTokenBalanceSpy.mockReturnValueOnce(new BigNumber("0"))
    isOptedInToCurrentAppSpy.mockReturnValueOnce(true)
    sendTransactionSpy.mockReturnValueOnce({ valid: true, transactionId: transactionId })

    const validResults = await algorandBlockchain.disableWallet(disableValues, hwAddress)

    expect.assertions(5)
    expect(getTokenBalanceSpy).toHaveBeenCalledTimes(1)
    expect(sendTransactionSpy).toHaveBeenCalledTimes(1)
    expect(isOptedInToCurrentAppSpy).toHaveBeenCalledTimes(1)
    expect(clearAppTxSpy).toHaveBeenCalledTimes(1)

    expect(validResults).toEqual({
      tokensWithdrawalTx: { status: "skipped", txHash: null, message: "Tokens balance is zero, transaction skipped" },
      clearAppTx: { status: "success", txHash: transactionId, message: `Successfully sent close out Tx id: ${transactionId}` },
      coinsWithdrawalTx: {}
    })
  })

  test('for zero token balance coins withdrawal and clear app executed', async () => {
    const disableValues = {
      tokenAddress: hwAddress,
      coinAddress: hwAddress
    }
    getTokenBalanceSpy.mockReturnValueOnce(new BigNumber("0"))
    isOptedInToCurrentAppSpy.mockReturnValueOnce(true)
    getAlgoBalanceForHotWalletSpy.mockReturnValueOnce(new BigNumber(txFee * 2 + 1))
    sendTransactionSpy.mockReturnValueOnce({ valid: true, transactionId: transactionId })
    sendWithdrawalCoinsTransactionSpy.mockReturnValueOnce({ valid: true, transactionId: transactionId + 1 })

    const validResults = await algorandBlockchain.disableWallet(disableValues, hwAddress)

    expect(getTokenBalanceSpy).toHaveBeenCalledTimes(1)
    expect(getAlgoBalanceForHotWalletSpy).toHaveBeenCalledTimes(1)
    expect(sendTransactionSpy).toHaveBeenCalledTimes(1)
    expect(isOptedInToCurrentAppSpy).toHaveBeenCalledTimes(1)
    expect(clearAppTxSpy).toHaveBeenCalledTimes(1)
    expect(sendWithdrawalCoinsTransactionSpy).toHaveBeenCalledTimes(1)

    expect(validResults).toEqual({
      tokensWithdrawalTx: { status: "skipped", txHash: null, message: "Tokens balance is zero, transaction skipped" },
      clearAppTx: { status: "success", txHash: transactionId, message: `Successfully sent close out Tx id: ${transactionId}` },
      coinsWithdrawalTx: {
        status: "success",
        txHash: transactionId + 1,
        message: `Successfully sent Tx id: ${transactionId + 1}`
      }
    })
  })

  test('for zero token balance clear app is executed and coins balance is less than minimum allowed', async () => {
    const disableValues = {
      tokenAddress: hwAddress,
      coinAddress: hwAddress
    }
    getTokenBalanceSpy.mockReturnValueOnce(new BigNumber("0"))
    getAlgoBalanceForHotWalletSpy.mockReturnValueOnce(new BigNumber(txFee * 2))
    isOptedInToCurrentAppSpy.mockReturnValueOnce(true)
    sendTransactionSpy.mockReturnValueOnce({ valid: true, transactionId: transactionId })
    sendWithdrawalCoinsTransactionSpy.mockReturnValueOnce({ valid: true, transactionId: transactionId + 1 })

    const validResults = await algorandBlockchain.disableWallet(disableValues, hwAddress)

    expect(getTokenBalanceSpy).toHaveBeenCalledTimes(1)
    expect(getAlgoBalanceForHotWalletSpy).toHaveBeenCalledTimes(1)
    expect(sendTransactionSpy).toHaveBeenCalledTimes(1)
    expect(clearAppTxSpy).toHaveBeenCalledTimes(1)
    expect(isOptedInToCurrentAppSpy).toHaveBeenCalledTimes(1)
    expect(sendWithdrawalCoinsTransactionSpy).toHaveBeenCalledTimes(0)

    expect(validResults).toEqual({
      tokensWithdrawalTx: { status: "skipped", txHash: null, message: "Tokens balance is zero, transaction skipped" },
      clearAppTx: { status: "success", txHash: transactionId, message: `Successfully sent close out Tx id: ${transactionId}` },
      coinsWithdrawalTx: {
        status: "skipped",
        txHash: null,
        message: `ALGO balance is <= ${txFee * 2}, transaction skipped`
      }
    })
  })

  test('coin balance withdrawed for already cleared app', async () => {
    const disableValues = {
      tokenAddress: hwAddress,
      coinAddress: hwAddress
    }
    getTokenBalanceSpy.mockReturnValueOnce(new BigNumber("0"))
    getAlgoBalanceForHotWalletSpy.mockReturnValueOnce(new BigNumber(txFee * 2 + 1))
    isOptedInToCurrentAppSpy.mockReturnValueOnce(false)
    sendWithdrawalCoinsTransactionSpy.mockReturnValueOnce({ valid: true, transactionId: transactionId })

    const validResults = await algorandBlockchain.disableWallet(disableValues, hwAddress)

    expect(getTokenBalanceSpy).toHaveBeenCalledTimes(1)
    expect(getAlgoBalanceForHotWalletSpy).toHaveBeenCalledTimes(1)
    expect(sendTransactionSpy).toHaveBeenCalledTimes(0)
    expect(clearAppTxSpy).toHaveBeenCalledTimes(0)
    expect(isOptedInToCurrentAppSpy).toHaveBeenCalledTimes(1)
    expect(sendWithdrawalCoinsTransactionSpy).toHaveBeenCalledTimes(1)

    expect(validResults).toEqual({
      tokensWithdrawalTx: { status: "skipped", txHash: null, message: "Tokens balance is zero, transaction skipped" },
      clearAppTx: { status: "skipped", txHash: null, message: "Transaction skipped" },
      coinsWithdrawalTx: {
        status: "success",
        txHash: transactionId,
        message: `Successfully sent Tx id: ${transactionId}`
      }
    })
  })

  test('for error during token transfer', async () => {
    const disableValues = {
      tokenAddress: hwAddress,
      coinAddress: hwAddress
    }
    getTokenBalanceSpy.mockReturnValueOnce(new BigNumber("1000000"))
    getAlgoBalanceForHotWalletSpy.mockReturnValueOnce(new BigNumber(txFee * 2 + 1))
    sendTransactionSpy.mockReturnValueOnce({ valid: false, transactionId: transactionId })
    sendWithdrawalCoinsTransactionSpy.mockReturnValueOnce({ valid: true, transactionId: transactionId + 1 })

    const validResults = await algorandBlockchain.disableWallet(disableValues, hwAddress)

    expect(getTokenBalanceSpy).toHaveBeenCalledTimes(1)
    expect(getAlgoBalanceForHotWalletSpy).toHaveBeenCalledTimes(0)
    expect(sendTransactionSpy).toHaveBeenCalledTimes(1)
    expect(clearAppTxSpy).toHaveBeenCalledTimes(0)
    expect(sendWithdrawalCoinsTransactionSpy).toHaveBeenCalledTimes(0)

    expect(validResults).toEqual({
      tokensWithdrawalTx: { status: "failed", txHash: null, message: "Error during withdraw tokens tx" },
      clearAppTx: { status: "skipped", txHash: null, message: "Transaction skipped" },
      coinsWithdrawalTx: {}
    })
  })

  test('when token balance, clear app and coins balance successfuly withdrawed', async () => {
    const disableValues = {
      tokenAddress: hwAddress,
      coinAddress: hwAddress
    }
    getTokenBalanceSpy.mockReturnValueOnce(new BigNumber("10"))
    getAlgoBalanceForHotWalletSpy.mockReturnValueOnce(new BigNumber(txFee * 2 + 1))
    sendTransactionSpy.mockReturnValueOnce({ valid: true, transactionId: transactionId })
    sendTransactionSpy.mockReturnValueOnce({ valid: true, transactionId: transactionId + 1 })
    sendWithdrawalCoinsTransactionSpy.mockReturnValueOnce({ valid: true, transactionId: transactionId + 2 })
    isOptedInToCurrentAppSpy.mockReturnValueOnce(true)

    const validResults = await algorandBlockchain.disableWallet(disableValues, hwAddress)

    expect(getTokenBalanceSpy).toHaveBeenCalledTimes(1)
    expect(getAlgoBalanceForHotWalletSpy).toHaveBeenCalledTimes(1)
    expect(sendTransactionSpy).toHaveBeenCalledTimes(2)
    expect(clearAppTxSpy).toHaveBeenCalledTimes(1)
    expect(isOptedInToCurrentAppSpy).toHaveBeenCalledTimes(1)
    expect(sendWithdrawalCoinsTransactionSpy).toHaveBeenCalledTimes(1)

    expect(validResults).toEqual({
      tokensWithdrawalTx: { status: "success", txHash: transactionId, message: `Successfully sent Tx id: ${transactionId}` },
      clearAppTx: { status: "success", txHash: transactionId + 1, message: `Successfully sent close out Tx id: ${transactionId + 1}` },
      coinsWithdrawalTx: {
        status: "success",
        txHash: transactionId + 2,
        message: `Successfully sent Tx id: ${transactionId + 2}`
      }
    })
  })
})
