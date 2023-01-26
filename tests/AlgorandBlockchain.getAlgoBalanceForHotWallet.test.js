const hwUtils = require("../lib/hotwalletUtils")
const BigNumber = require('bignumber.js')
const envs = {
  projectId: "1",
  projectApiKey: "project_api_key",
  comakeryServerUrl: null,
  purestakeApi: "purestake_api_key",
  redisUrl: "redis://localhost:6379/0",
  emptyQueueDelay: 30,
  optInApp: 13997710,
  blockchainNetwork: "algorand_test"
}

describe("Get Algo balance for Hot Wallet", () => {
  const hwAddress = "YFGM3UODOZVHSI4HXKPXOKFI6T2YCIK3HKWJYXYFQBONJD4D3HD2DPMYW4"

  test("with succesfully response", async () => {
    const hwAlgorand = new hwUtils.AlgorandBlockchain(envs)
    const getBalance = (balance) => {
      return {
        amount: BigInt(balance)
      }
    }
    const doMock = jest.fn()
    doMock.mockReturnValueOnce(getBalance(1000))
    doMock.mockReturnValueOnce(getBalance(900))
    jest.spyOn(hwAlgorand.algodClient, "accountInformation").mockImplementation(() => {
      return { 
        do: doMock
      }
    });

    res = await hwAlgorand.getAlgoBalanceForHotWallet(hwAddress)

    expect(res).toEqual(new BigNumber("1000"))

    // result is not cached
    res = await hwAlgorand.getAlgoBalanceForHotWallet(hwAddress)
    expect(res).toEqual(new BigNumber("900"))
  })

  test("with no account found error", async () => {
    const hwAlgorand = new hwUtils.AlgorandBlockchain(envs)
    jest.spyOn(hwAlgorand.algodClient, "accountInformation").mockImplementation(() => {
      throw new Error('no accounts found for address')
    });

    res = await hwAlgorand.getAlgoBalanceForHotWallet(hwAddress)

    expect(res).toEqual(new BigNumber(0))
  })

  test("with failed response", async () => {
    const hwAlgorand = new hwUtils.AlgorandBlockchain(envs)
    jest.spyOn(hwAlgorand.algodClient, "accountInformation").mockImplementation(() => {
      throw new Error('error')
    });

    res = await hwAlgorand.getAlgoBalanceForHotWallet(hwAddress)

    expect(res).toEqual(new BigNumber(NaN))
  })
});
