const axios = require("axios")
const redis = require("redis")
const BigNumber = require('bignumber.js')
const hwUtils = require("../lib/hotwalletUtils")
const envs = {
  projectId: "1",
  projectApiKey: "project_api_key",
  comakeryServerUrl: null,
  purestakeApi: "purestake_api_key",
  redisUrl: "redis://localhost:6379/0",
  emptyQueueDelay: 30
}
jest.mock("axios")

describe("Get next transaction to sign in", () => {
  const wallet = { address: "YFGM3UODOZVHSI4HXKPXOKFI6T2YCIK3HKWJYXYFQBONJD4D3HD2DPMYW4", mnemonic: "mnemonic phrase" }
  const blockchainTransaction = { id: 99, network: "algorand_test" }
  const hwApi = new hwUtils.ComakeryApi(envs)

  test("API returns empty response", async () => {
    expect.assertions(1);
    axios.mockImplementation(() => Promise.resolve({ status: 204, data: null }))
    res = await hwApi.getNextTransactionToSign(wallet.address)

    expect(res).toEqual({})
  })

  test("API returns a blockchain transaction", async () => {
    expect.assertions(1);
    axios.mockImplementation(() => Promise.resolve({ status: 201, data: JSON.stringify(blockchainTransaction), headers: {} }))
    res = await hwApi.getNextTransactionToSign(wallet.address)
    expect(res).toEqual(blockchainTransaction)
  })

  test("API returns failed response", async () => {
    const data = {
      response: {
        status: 500,
        statusText: "Server error",
        data: { errors: { any: "error" } }
      }
    }

    axios.mockReturnValue(Promise.reject(data));
    res = await hwApi.getNextTransactionToSign(wallet.address)

    expect(res).toEqual({})
  })

  test("API returns a wallet disable header", async () => {
    expect.assertions(1);
    axios.mockImplementation(() => Promise.resolve({ status: 200, data: {}, headers: { 'robowallet-disable': '{"disable": "params"}' } }))
    res = await hwApi.getNextTransactionToSign(wallet.address)

    expect(res).toEqual({ disableWalletWith: { disable: "params" } })
  })

  test("API returns a BigNumber in amount", async () => {
    const txRaw = '{"amount": 100000000123456789}'
    const amount = new BigNumber("100000000123456789")

    expect.assertions(1);
    axios.mockImplementation(() => Promise.resolve({ status: 201, data: txRaw, headers: {} }))
    res = await hwApi.getNextTransactionToSign(wallet.address)
    console.log(res);
    expect(res.amount).toEqual(amount)
  })

  test("API returns a number in amount", async () => {
    const txRaw = '{"amount": 1000}'

    expect.assertions(1);
    axios.mockImplementation(() => Promise.resolve({ status: 201, data: txRaw, headers: {} }))
    res = await hwApi.getNextTransactionToSign(wallet.address)
    console.log(res);
    expect(res.amount).toEqual(1000)
  })
});
