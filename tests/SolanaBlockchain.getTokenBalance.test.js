const SolanaBlockchain = require('../lib/blockchains/SolanaBlockchain').SolanaBlockchain
const BigNumber = require('bignumber.js')

const solanaBlockchain = new SolanaBlockchain({
  figmentApiKey: "figmeent_api_key",
  blockchainNetwork: 'solana_devnet'
})

describe("SolanaBlockchain check for SPL balance", () => {
  test('return balance as a BigNumber object', async () => {
    const mockedTokenAccounts = {
        context: { slot: 96599736, },
        value: [ {
            account: { lamports: 2039280, rentEpoch: 223 },
            pubkey: { _bn: { negative: 0, words: [ 44028422, 52313171, 31863202, 17071259, 38595740, 18403893, 17785442, 39748219, 11378582, 497027, 0, ], length: 10, red: null }, },
          } ]
    }
    const mockedTokenAccountBalance = {
      context: { slot: 96601651, },
      value: {
        amount: "9999997996267",
        decimals: 9,
        uiAmount: 9999.997996267,
        uiAmountString: "9999.997996267",
      }
    }

    jest.spyOn(solanaBlockchain.web3, "getTokenAccountsByOwner").mockImplementation(() => mockedTokenAccounts)
    jest.spyOn(solanaBlockchain.web3, "getTokenAccountBalance").mockImplementation(() => mockedTokenAccountBalance)

    const balance = await solanaBlockchain.getTokenBalance("33MWWFqCqjKYhWrqwFcqmq5yFerdNJ9JQbKpKqMynmZL", "91enn7UUM3rXqqMAmYgYRNuVQBRgTumTvV7kMCVyz5g")

    expect(balance.balanceInBaseUnit).toEqual(new BigNumber("9999997996267"))
    expect(balance.balance).toEqual(new BigNumber(9999.997996267))
  })

  test('return zero if TokenAccounts is empty', async () => {
    const mockedTokenAccounts = { context: { slot: 96599736, }, value: [ ] }
    jest.spyOn(solanaBlockchain.web3, "getTokenAccountsByOwner").mockImplementation(() => mockedTokenAccounts)

    const balance = await solanaBlockchain.getTokenBalance("33MWWFqCqjKYhWrqwFcqmq5yFerdNJ9JQbKpKqMynmZL", "91enn7UUM3rXqqMAmYgYRNuVQBRgTumTvV7kMCVyz5g")

    expect(balance.balanceInBaseUnit).toEqual(new BigNumber(0))
    expect(balance.balance).toEqual(new BigNumber(0))
  })

  test('return zero if something went wrong', async () => {
    const mockedTokenAccounts = { error: "something went wrong" }
    jest.spyOn(solanaBlockchain.web3, "getTokenAccountsByOwner").mockImplementation(() => mockedTokenAccounts)

    const balance = await solanaBlockchain.getTokenBalance("33MWWFqCqjKYhWrqwFcqmq5yFerdNJ9JQbKpKqMynmZL", "91enn7UUM3rXqqMAmYgYRNuVQBRgTumTvV7kMCVyz5g")

    expect(balance.balanceInBaseUnit).toEqual(new BigNumber(0))
    expect(balance.balance).toEqual(new BigNumber(0))
  })
});
