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
  const hwAlgorand = new hwUtils.AlgorandBlockchain(envs)
  const hwAddress = "YFGM3UODOZVHSI4HXKPXOKFI6T2YCIK3HKWJYXYFQBONJD4D3HD2DPMYW4"

  test("with succesfully response", async () => {
    jest.spyOn(hwAlgorand, "connect").mockImplementation(() => { return true });
    jest.spyOn(hwAlgorand.chain, "fetchBalance").mockImplementation(() => { return { balance: "99.5" } });

    res = await hwAlgorand.getAlgoBalanceForHotWallet(hwAddress)

    expect(res).toEqual(new BigNumber("99.5"))
  })
});
