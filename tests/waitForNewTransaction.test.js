const axios = require("axios")
const redis = require("redis")
const hwUtils = require("../lib/hotwalletUtils")
jest.mock("axios")

describe("For Ethereum blockchain", () => {
  const envs = {
    projectId: "1",
    projectApiKey: "project_api_key",
    comakeryServerUrl: null,
    alchemyApiKey: "alchemy_api_key",
    redisUrl: "redis://localhost:6379/0",
    blockchainNetwork: "ethereum_sepolia"
  }
  const redisClient = redis.createClient()
  const hwRedis = new hwUtils.HotWalletRedis(envs, redisClient)
  const wallet = new hwUtils.HotWallet("ethereum_sepolia", "0x15b4eda54e7aa56e4ca4fe6c19f7bf9d82eca2fc", {})

  beforeEach(() => {
    jest.spyOn(hwRedis, "hotWallet").mockReturnValueOnce(wallet)
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  afterAll(() => {
    redisClient.quit()
  });

  test("with zero coin balance", async () => {
    jest.spyOn(hwUtils.Blockchain.prototype, "enoughCoinBalanceToSendTransaction").mockReturnValueOnce(false)

    const res = await hwUtils.waitForNewTransaction(envs, hwRedis)

    expect(res).toEqual({ "blockchainTransaction": {}, "status": "failed_before_getting_tx", "transaction": {} })
  })

  test("API returns empty response", async () => {
    jest.spyOn(hwUtils.Blockchain.prototype, "enoughCoinBalanceToSendTransaction").mockReturnValueOnce(true)
    jest.spyOn(wallet, "isReadyToSendTx").mockReturnValueOnce(true)
    jest.spyOn(hwUtils.ComakeryApi.prototype, "getNextTransactionToSign").mockReturnValueOnce({})
    const isTransactionValidSpy = jest.spyOn(hwUtils.Blockchain.prototype, "isTransactionValid")
    const disableHotWalletSpy = jest.spyOn(hwUtils.ComakeryApi.prototype, "disableHotWallet")

    const res = await hwUtils.waitForNewTransaction(envs, hwRedis)

    expect(res).toEqual({ "blockchainTransaction": {}, "status": "no_transaction", "transaction": {} })
    expect(isTransactionValidSpy).toHaveBeenCalledTimes(0)
    expect(disableHotWalletSpy).toHaveBeenCalledTimes(0)
  })

  test("repeat while error on updateTransactionHash", async () => {
    jest.spyOn(hwUtils.Blockchain.prototype, "enoughCoinBalanceToSendTransaction").mockReturnValueOnce(true)
    jest.spyOn(wallet, "isReadyToSendTx").mockReturnValueOnce(true)
    jest.spyOn(hwUtils.Blockchain.prototype, "isTransactionValid").mockReturnValueOnce({ valid: true })
    jest.spyOn(hwUtils.ComakeryApi.prototype, "getNextTransactionToSign").mockReturnValueOnce({ txHash: "TXHASH" })
    jest.spyOn(hwUtils.Blockchain.prototype, "sendTransaction").mockReturnValueOnce({ transactionId: "TXHASH" })
    const sleepSpy = jest.spyOn(hwUtils.ComakeryApi.prototype, "sleep").mockReturnValueOnce({})
    const axiosPutSpy = jest.spyOn(axios, 'put')
    axiosPutSpy.mockReturnValueOnce(Promise.resolve({ status: 404, data: {} }))
    axiosPutSpy.mockReturnValueOnce(Promise.resolve({ status: 200, data: {txHash: "TXHASH"} }))

    const res = await hwUtils.waitForNewTransaction(envs, hwRedis)
    await new Promise((r) => setTimeout(r, 100));

    expect(res).toEqual({ "blockchainTransaction": { "txHash": "TXHASH" }, "status": "successfull", "transaction": { "transactionId": "TXHASH" } })
    expect(axiosPutSpy).toHaveBeenCalledTimes(2)
    expect(sleepSpy).toHaveBeenCalledTimes(1)
  })

  test("success, API returns a blockchain transaction", async () => {
    jest.spyOn(hwUtils.Blockchain.prototype, "enoughCoinBalanceToSendTransaction").mockReturnValueOnce(true)
    jest.spyOn(wallet, "isReadyToSendTx").mockReturnValueOnce(true)
    jest.spyOn(hwUtils.Blockchain.prototype, "isTransactionValid").mockReturnValueOnce({ valid: true })
    jest.spyOn(hwUtils.ComakeryApi.prototype, "getNextTransactionToSign").mockReturnValueOnce({ txHash: "TXHASH" })
    jest.spyOn(hwUtils.Blockchain.prototype, "sendTransaction").mockReturnValueOnce({ transactionId: "TXHASH" })
    const updateTransactionHashSpy = jest.spyOn(hwUtils.ComakeryApi.prototype, "updateTransactionHash")
    axios.put.mockImplementation(() => Promise.resolve({ status: 200, data: { id: 99, network: "ethereum_sepolia", txHash: "TXHASH" } }))

    const res = await hwUtils.waitForNewTransaction(envs, hwRedis)

    expect(res).toEqual({ "blockchainTransaction": { "txHash": "TXHASH" }, "status": "successfull", "transaction": { "transactionId": "TXHASH" } })
    expect(updateTransactionHashSpy).toHaveBeenCalledTimes(1)
  })

  test("with validation error format error", async () => {
    jest.spyOn(hwUtils.Blockchain.prototype, "enoughCoinBalanceToSendTransaction").mockReturnValueOnce(true)
    jest.spyOn(wallet, "isReadyToSendTx").mockReturnValueOnce(true)
    jest.spyOn(hwUtils.Blockchain.prototype, "isTransactionValid").mockReturnValueOnce({ valid: false, error: "Some error" })
    jest.spyOn(hwUtils.ComakeryApi.prototype, "getNextTransactionToSign").mockReturnValueOnce({ id: 123 })
    const sendTransactionSpy = jest.spyOn(hwUtils.Blockchain.prototype, "sendTransaction")
    const cancelTransactionSpy = jest.spyOn(hwUtils.ComakeryApi.prototype, "cancelTransaction")
    const updateTransactionHashSpy = jest.spyOn(hwUtils.ComakeryApi.prototype, "updateTransactionHash")

    const res = await hwUtils.waitForNewTransaction(envs, hwRedis)
    expect(res).toEqual({ "blockchainTransaction": { "id": 123 }, "status": "validation_failed", "transaction": {} })
    expect(cancelTransactionSpy).toHaveBeenCalledTimes(0)
    expect(sendTransactionSpy).toHaveBeenCalledTimes(0)
    expect(updateTransactionHashSpy).toHaveBeenCalledTimes(0)
  })

  test("with validation error data error", async () => {
    jest.spyOn(hwUtils.Blockchain.prototype, "enoughCoinBalanceToSendTransaction").mockReturnValueOnce(true)
    jest.spyOn(wallet, "isReadyToSendTx").mockReturnValueOnce(true)
    jest.spyOn(hwUtils.Blockchain.prototype, "isTransactionValid").mockReturnValueOnce({ valid: false, markAs: "failed", error: "Some error" })
    jest.spyOn(hwUtils.ComakeryApi.prototype, "getNextTransactionToSign").mockReturnValueOnce({ id: 123 })
    const sendTransactionSpy = jest.spyOn(hwUtils.Blockchain.prototype, "sendTransaction")
    const cancelTransactionSpy = jest.spyOn(hwUtils.ComakeryApi.prototype, "cancelTransaction")
    const updateTransactionHashSpy = jest.spyOn(hwUtils.ComakeryApi.prototype, "updateTransactionHash")

    const res = await hwUtils.waitForNewTransaction(envs, hwRedis)
    expect(res).toEqual({ "blockchainTransaction": { "id": 123 }, "status": "validation_failed", "transaction": {} })
    expect(cancelTransactionSpy).toHaveBeenCalledTimes(1)
    expect(sendTransactionSpy).toHaveBeenCalledTimes(0)
    expect(updateTransactionHashSpy).toHaveBeenCalledTimes(0)
  })

  test("transaction sending was failed", async () => {
    jest.spyOn(hwUtils.Blockchain.prototype, "enoughCoinBalanceToSendTransaction").mockReturnValueOnce(true)
    jest.spyOn(wallet, "isReadyToSendTx").mockReturnValueOnce(true)
    jest.spyOn(hwUtils.Blockchain.prototype, "isTransactionValid").mockReturnValueOnce({ valid: true })
    jest.spyOn(hwUtils.ComakeryApi.prototype, "getNextTransactionToSign").mockReturnValueOnce({ txHash: "TXHASH" })
    jest.spyOn(hwUtils.Blockchain.prototype, "sendTransaction").mockReturnValueOnce({ valid: false, markAs: "failed", error: "some error" })
    const cancelTransactionSpy = jest.spyOn(hwUtils.ComakeryApi.prototype, "cancelTransaction")
    const updateTransactionHashSpy = jest.spyOn(hwUtils.ComakeryApi.prototype, "updateTransactionHash")

    const res = await hwUtils.waitForNewTransaction(envs, hwRedis)
    expect(res).toEqual({
      "blockchainTransaction": { "txHash": "TXHASH" },
      "status": "cancelled_transaction",
      "transaction": { "error": "some error", "markAs": "failed", "valid": false }
    })
    expect(cancelTransactionSpy).toHaveBeenCalledTimes(1)
    expect(updateTransactionHashSpy).toHaveBeenCalledTimes(0)
  })

  test("transaction already sent", async () => {
    jest.spyOn(hwUtils.Blockchain.prototype, "enoughCoinBalanceToSendTransaction").mockReturnValueOnce(true)
    jest.spyOn(wallet, "isReadyToSendTx").mockReturnValueOnce(true)
    jest.spyOn(hwUtils.Blockchain.prototype, "isTransactionValid").mockReturnValueOnce({ valid: true })
    jest.spyOn(hwUtils.ComakeryApi.prototype, "getNextTransactionToSign").mockReturnValueOnce({ id: 1, type: "Award" })
    const sendTransactionSpy = jest.spyOn(hwUtils.Blockchain.prototype, "sendTransaction").mockReturnValueOnce({ valid: true })
    jest.spyOn(hwUtils.HotWalletRedis.prototype, "getSavedDataForTransaction").mockReturnValueOnce({ key: "bt_Award#1" })
    const cancelTransactionSpy = jest.spyOn(hwUtils.ComakeryApi.prototype, "cancelTransaction")

    const res = await hwUtils.waitForNewTransaction(envs, hwRedis)
    expect(res).toEqual({
      "blockchainTransaction": { id: 1, type: "Award" },
      "status": "tx_already_sent",
      "transaction": {}
    })

    expect(sendTransactionSpy).toHaveBeenCalledTimes(0)
    expect(cancelTransactionSpy).toHaveBeenCalledTimes(1)
  })

  test("validation mark the transaction as failed", async () => {
    jest.spyOn(hwUtils.Blockchain.prototype, "enoughCoinBalanceToSendTransaction").mockReturnValueOnce(true)
    jest.spyOn(wallet, "isReadyToSendTx").mockReturnValueOnce(true)
    const transaction = { txHash: "TXHASH" }
    jest.spyOn(hwUtils.ComakeryApi.prototype, "getNextTransactionToSign").mockReturnValueOnce(transaction);
    const cancelTransactionSpy = jest.spyOn(hwUtils.ComakeryApi.prototype, "cancelTransaction").mockReturnValueOnce({ status: 200, data: transaction })
    const updateTransactionHashSpy = jest.spyOn(hwUtils.ComakeryApi.prototype, "updateTransactionHash").mockReturnValueOnce({ status: 200, data: transaction })
    jest.spyOn(hwUtils.Blockchain.prototype, "isTransactionValid").mockReturnValueOnce({ valid: false, error: "Some error", markAs: "failed" })

    const res = await hwUtils.waitForNewTransaction(envs, hwRedis)

    expect(res).toEqual({ "blockchainTransaction": { "txHash": "TXHASH" }, "status": "validation_failed", "transaction": {} })
    expect(cancelTransactionSpy).toHaveBeenCalledTimes(1)
    expect(updateTransactionHashSpy).toHaveBeenCalledTimes(0)
  })

  test("validation mark the transaction as cancelled", async () => {
    jest.spyOn(hwUtils.Blockchain.prototype, "enoughCoinBalanceToSendTransaction").mockReturnValueOnce(true)
    jest.spyOn(wallet, "isReadyToSendTx").mockReturnValueOnce(true)
    const transaction = { txHash: "TXHASH" }
    jest.spyOn(hwUtils.ComakeryApi.prototype, "getNextTransactionToSign").mockReturnValueOnce(transaction);
    const cancelTransactionSpy = jest.spyOn(hwUtils.ComakeryApi.prototype, "cancelTransaction").mockReturnValueOnce({ status: 200, data: transaction })
    const updateTransactionHashSpy = jest.spyOn(hwUtils.ComakeryApi.prototype, "updateTransactionHash").mockReturnValueOnce({ status: 200, data: transaction })
    jest.spyOn(hwUtils.Blockchain.prototype, "isTransactionValid").mockReturnValueOnce({ valid: false, error: "Some error", markAs: "cancelled" })

    const res = await hwUtils.waitForNewTransaction(envs, hwRedis)

    expect(res).toEqual({ "blockchainTransaction": { "txHash": "TXHASH" }, "status": "validation_failed", "transaction": {} })
    expect(cancelTransactionSpy).toHaveBeenCalledTimes(1)
    expect(updateTransactionHashSpy).toHaveBeenCalledTimes(0)
  })
});

