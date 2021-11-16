const SolanaBlockchain = require('../lib/blockchains/SolanaBlockchain').SolanaBlockchain
const BigNumber = require('bignumber.js')

describe("SolanaBlockchain check for SOL balance", () => {
  test('return balance as a BigNumber object', async () => {
    const solanaBlockchain = new SolanaBlockchain({
      figmentApiKey: "figmeent_api_key",
      blockchainNetwork: 'solana_devnet'
    })

    jest.spyOn(solanaBlockchain.web3, "getBalance").mockImplementation(() => { return "99500000000" });

    const balance = await solanaBlockchain.getSolBalance("33MWWFqCqjKYhWrqwFcqmq5yFerdNJ9JQbKpKqMynmZL")
    expect(balance.lamports).toEqual(new BigNumber("99500000000"))
    expect(balance.sol).toEqual(new BigNumber("99.5"))
  })

  test('return zero of something went wrong', async () => {
    const solanaBlockchain = new SolanaBlockchain({
      figmentApiKey: "figmeent_api_key",
      blockchainNetwork: 'solana_devnet'
    })

    jest.spyOn(solanaBlockchain.web3, "getBalance").mockImplementation(() => { return "wrong" });

    const balance = await solanaBlockchain.getSolBalance("33MWWFqCqjKYhWrqwFcqmq5yFerdNJ9JQbKpKqMynmZL")
    expect(balance.lamports).toEqual(new BigNumber(0))
    expect(balance.sol).toEqual(new BigNumber(0))
  })
});
