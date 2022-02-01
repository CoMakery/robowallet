const axios = require("axios")
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

describe("Update transaction hash test suite", () => {
  const blockchainTransaction = { id: 99, hash: 'txHash'}
  const hwApi = new hwUtils.ComakeryApi(envs)
  const successResult = { status: 200, data: {} }
  const sleepSpy = jest.spyOn(hwApi, "sleep").mockImplementation(() => {return {}})

  test("API returns successful result", async () => {
    expect.assertions(3);
    const axiosPutSpy = jest.spyOn(axios, 'put')
    axiosPutSpy.mockReturnValueOnce(Promise.resolve(successResult))
  
    res = await hwApi.updateTransactionHash(blockchainTransaction)

    expect(res).toEqual(successResult.data)
    expect(axiosPutSpy).toHaveBeenCalledTimes(1)
    expect(sleepSpy).toHaveBeenCalledTimes(0)
  })

  test("API returns transaction not found 404", async () => {
    const axiosPutSpy = jest.spyOn(axios, 'put')
    axiosPutSpy.mockReturnValueOnce(Promise.reject({ status: 404, data: {} }))
    axiosPutSpy.mockReturnValueOnce(Promise.resolve(successResult))
    
    res = await hwApi.updateTransactionHash(blockchainTransaction)

    expect(res).toEqual(successResult.data)
    expect(axiosPutSpy).toHaveBeenCalledTimes(2)
    expect(sleepSpy).toHaveBeenCalledTimes(1)
  }) 

  test("API returns transaction not found 204", async () => {
    const axiosPutSpy = jest.spyOn(axios, 'put')
    axiosPutSpy.mockReturnValueOnce(Promise.resolve({ status: 204, data: {} }))
    axiosPutSpy.mockReturnValueOnce(Promise.resolve(successResult))
    
    res = await hwApi.updateTransactionHash(blockchainTransaction)

    expect(res).toEqual(successResult.data)
    expect(axiosPutSpy).toHaveBeenCalledTimes(2)
    expect(sleepSpy).toHaveBeenCalledTimes(1)
  }) 
})
