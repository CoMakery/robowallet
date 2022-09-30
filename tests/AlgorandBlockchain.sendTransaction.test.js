const hwUtils = require("../lib/hotwalletUtils")
const BigNumber = require('bignumber.js')
const {
  blockchainTransaction,
  blockchainTransactionAsset,
  blockchainTransactionPayment
} = require("./fixtures/algorandBlockchainTransaction");

const envs = {
  projectId: "1",
  projectApiKey: "project_api_key",
  comakeryServerUrl: null,
  purestakeApi: "purestake_api_key",
  redisUrl: "redis://localhost:6379/0",
  emptyQueueDelay: 30,
  optInApp: 13997710,
  blockchainNetwork: "algorand_test",
}

describe("Send transactio test suite", () => {
  const hwAddress = "YFGM3UODOZVHSI4HXKPXOKFI6T2YCIK3HKWJYXYFQBONJD4D3HD2DPMYW4"
  const txHash = "oLuvyorned9hLWYuDQ8zd9upCHBS36EB3yznf1NdceQ7coVw9poEtnaQXDEEgiPrvUzDUneDNvxvwAtckZJUcjC"
  const hotWalet = {
    address: hwAddress,
    privateKey: '7ff639af5da4d3bbb2523cd1a2bf4724b97e042b5432697e0f89f20977b62f3dac88697d2843de551de09717461f5ce7626bcad3241870694cd1a1c44d341bfb'
  }
  let transaction = {
    getSuggestedFee: jest.fn(),
    setDesiredFee: jest.fn(),
    prepareToBeSigned: jest.fn(),
    validate: jest.fn(),
    sign: jest.fn(),
    send: jest.fn()
  }

  afterAll(() => {
    jest.restoreAllMocks()
  })

  test('for undefined tx data', async () => {
    const hwAlgorand = new hwUtils.AlgorandBlockchain(Object.assign(envs, { maxAmountForTransfer: 0 }))
    const connectSpy = jest.spyOn(hwAlgorand, "connect").mockReturnValueOnce(5)

    const transactionSpy = jest.spyOn(hwAlgorand.chain.new, "Transaction").mockReturnValueOnce(5)
    const tx = undefined

    const res = await hwAlgorand.sendTransaction(tx, hotWalet)

    expect(res).toEqual({
      error: "Cannot read property 'txRaw' of undefined",
      markAs: "failed",
      valid: false,
    })
    expect(connectSpy).toHaveBeenCalledTimes(1)
    expect(transactionSpy).toHaveBeenCalledTimes(1)
  })

  test('for unknown action in tx data', async () => {
    const hwAlgorand = new hwUtils.AlgorandBlockchain(Object.assign(envs, { maxAmountForTransfer: 0 }))
    const connectSpy = jest.spyOn(hwAlgorand, "connect").mockReturnValueOnce(5)

    const transactionSpy = jest.spyOn(hwAlgorand.chain.new, "Transaction").mockReturnValueOnce(5)
    const composeActionSpy = jest.spyOn(hwAlgorand.chain, "composeAction").mockReturnValueOnce(5)
    const appTx = { ...blockchainTransaction }

    const res = await hwAlgorand.sendTransaction(appTx, hotWalet)

    expect(res).toEqual({
      error: "Cannot create property 'actions' on number '5'",
      markAs: "failed",
      valid: false,
    })
    expect(connectSpy).toHaveBeenCalledTimes(1)
    expect(transactionSpy).toHaveBeenCalledTimes(1)
    expect(composeActionSpy).toHaveBeenCalledTimes(1)
  })

  test('for not enough balance to pay fee', async () => {
    const hwAlgorand = new hwUtils.AlgorandBlockchain(Object.assign(envs, { maxAmountForTransfer: 0 }))
    const connectSpy = jest.spyOn(hwAlgorand, "connect").mockReturnValueOnce(5)

    transaction.getSuggestedFee.mockReturnValueOnce(new BigNumber(1001))
    const transactionSpy = jest.spyOn(hwAlgorand.chain.new, "Transaction").mockReturnValueOnce(transaction)
    const composeActionSpy = jest.spyOn(hwAlgorand.chain, "composeAction").mockReturnValueOnce(5)
    let getAlgoBalanceForHwSpy = jest.spyOn(hwAlgorand, "getAlgoBalanceForHotWallet")
    getAlgoBalanceForHwSpy.mockReturnValueOnce(new BigNumber(1000))
    const appTx = { ...blockchainTransaction }

    const res = await hwAlgorand.sendTransaction(appTx, hotWalet)

    expect(res).toEqual({
      error: `The Hot Wallet has insufficient algo to pay a fee. Please top up the ${hwAddress}`,
      markAs: "cancelled",
      valid: false,
    })
    expect(connectSpy).toHaveBeenCalledTimes(1)
    expect(transactionSpy).toHaveBeenCalledTimes(1)
    expect(composeActionSpy).toHaveBeenCalledTimes(1)
  })

  test('for not valid algorand private key', async () => {
    const hwAlgorand = new hwUtils.AlgorandBlockchain(Object.assign(envs, { maxAmountForTransfer: 0 }))
    const connectSpy = jest.spyOn(hwAlgorand, "connect").mockReturnValueOnce(5)
    let hwNotInitedKey = { ...hotWalet }
    hwNotInitedKey.privateKey = ''

    transaction.getSuggestedFee.mockReturnValueOnce(new BigNumber(1000))
    const transactionSpy = jest.spyOn(hwAlgorand.chain.new, "Transaction").mockReturnValueOnce(transaction)
    const composeActionSpy = jest.spyOn(hwAlgorand.chain, "composeAction").mockReturnValueOnce(5)
    let getAlgoBalanceForHwSpy = jest.spyOn(hwAlgorand, "getAlgoBalanceForHotWallet")
    getAlgoBalanceForHwSpy.mockReturnValueOnce(new BigNumber(1000))
    const appTx = { ...blockchainTransaction }

    const res = await hwAlgorand.sendTransaction(appTx, hwNotInitedKey)

    expect(res).toEqual({
      error: `Not a valid algorand private key:${hwNotInitedKey.privateKey}.`,
      markAs: "failed",
      valid: false,
    })
    expect(connectSpy).toHaveBeenCalledTimes(1)
    expect(transactionSpy).toHaveBeenCalledTimes(1)
    expect(composeActionSpy).toHaveBeenCalledTimes(1)
  })

  test('for successful app transaction', async () => {
    const hwAlgorand = new hwUtils.AlgorandBlockchain(Object.assign(envs, { maxAmountForTransfer: 0 }))
    const connectSpy = jest.spyOn(hwAlgorand, "connect").mockReturnValueOnce(5)
    const txResult = { transactionId: txHash }
    transaction.getSuggestedFee.mockReturnValueOnce(new BigNumber(1000))
    transaction.send.mockReturnValueOnce(txResult)

    const transactionSpy = jest.spyOn(hwAlgorand.chain.new, "Transaction").mockReturnValueOnce(transaction)
    const composeActionSpy = jest.spyOn(hwAlgorand.chain, "composeAction").mockReturnValueOnce(5)
    let getAlgoBalanceForHwSpy = jest.spyOn(hwAlgorand, "getAlgoBalanceForHotWallet")
    getAlgoBalanceForHwSpy.mockReturnValueOnce(new BigNumber(1000))
    const appTx = { ...blockchainTransaction }

    const res = await hwAlgorand.sendTransaction(appTx, hotWalet)

    expect(res).toEqual(txResult)
    expect(connectSpy).toHaveBeenCalledTimes(1)
    expect(transactionSpy).toHaveBeenCalledTimes(1)
    expect(composeActionSpy).toHaveBeenCalledTimes(1)
  })

  test('for successful payment transaction', async () => {
    const hwAlgorand = new hwUtils.AlgorandBlockchain(Object.assign(envs, { maxAmountForTransfer: 0 }))
    const connectSpy = jest.spyOn(hwAlgorand, "connect").mockReturnValueOnce(5)
    const txResult = { transactionId: txHash }
    transaction.getSuggestedFee.mockReturnValueOnce(new BigNumber(1000))
    transaction.send.mockReturnValueOnce(txResult)

    const transactionSpy = jest.spyOn(hwAlgorand.chain.new, "Transaction").mockReturnValueOnce(transaction)
    const composeActionSpy = jest.spyOn(hwAlgorand.chain, "composeAction").mockReturnValueOnce(5)
    let getAlgoBalanceForHwSpy = jest.spyOn(hwAlgorand, "getAlgoBalanceForHotWallet")
    getAlgoBalanceForHwSpy.mockReturnValueOnce(new BigNumber(1000))
    const appTx = { ...blockchainTransactionPayment }

    const res = await hwAlgorand.sendTransaction(appTx, hotWalet)

    expect(res).toEqual(txResult)
    expect(connectSpy).toHaveBeenCalledTimes(1)
    expect(transactionSpy).toHaveBeenCalledTimes(1)
    expect(composeActionSpy).toHaveBeenCalledTimes(1)
  })

  test('for successful asset transaction', async () => {
    const hwAlgorand = new hwUtils.AlgorandBlockchain(Object.assign(envs, { maxAmountForTransfer: 0 }))
    const connectSpy = jest.spyOn(hwAlgorand, "connect").mockReturnValueOnce(5)
    const txResult = { transactionId: txHash }
    transaction.getSuggestedFee.mockReturnValueOnce(new BigNumber(1000))
    transaction.send.mockReturnValueOnce(txResult)

    const transactionSpy = jest.spyOn(hwAlgorand.chain.new, "Transaction").mockReturnValueOnce(transaction)
    const composeActionSpy = jest.spyOn(hwAlgorand.chain, "composeAction").mockReturnValueOnce(5)
    let getAlgoBalanceForHwSpy = jest.spyOn(hwAlgorand, "getAlgoBalanceForHotWallet")
    getAlgoBalanceForHwSpy.mockReturnValueOnce(new BigNumber(1000))
    const appTx = { ...blockchainTransactionAsset }

    const res = await hwAlgorand.sendTransaction(appTx, hotWalet)

    expect(res).toEqual(txResult)
    expect(connectSpy).toHaveBeenCalledTimes(1)
    expect(transactionSpy).toHaveBeenCalledTimes(1)
    expect(composeActionSpy).toHaveBeenCalledTimes(1)
  })

  test('for exception on any transaction send step', async () => {
    const hwAlgorand = new hwUtils.AlgorandBlockchain(Object.assign(envs, { maxAmountForTransfer: 0 }))
    const connectSpy = jest.spyOn(hwAlgorand, "connect").mockReturnValueOnce(5)
    const err = Error("Transaction process was broken. EOT")

    let transactionObj = { ...transaction }
    transactionObj.getSuggestedFee.mockReturnValueOnce(new BigNumber(1000))
    transactionObj.validate.mockImplementation(() => { throw err })
    const transactionSpy = jest.spyOn(hwAlgorand.chain.new, "Transaction").mockReturnValueOnce(transactionObj)
    const composeActionSpy = jest.spyOn(hwAlgorand.chain, "composeAction").mockReturnValueOnce(5)
    let getAlgoBalanceForHwSpy = jest.spyOn(hwAlgorand, "getAlgoBalanceForHotWallet")
    getAlgoBalanceForHwSpy.mockReturnValueOnce(new BigNumber(1000))
    const appTx = { ...blockchainTransaction }

    const res = await hwAlgorand.sendTransaction(appTx, hotWalet)

    expect(res).toEqual({
      error: err.message,
      markAs: "failed",
      valid: false,
    })
    expect(connectSpy).toHaveBeenCalledTimes(1)
    expect(transactionSpy).toHaveBeenCalledTimes(1)
    expect(composeActionSpy).toHaveBeenCalledTimes(1)
  })

})
