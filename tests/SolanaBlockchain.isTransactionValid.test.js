
const SolanaBlockchain = require('../lib/blockchains/SolanaBlockchain').SolanaBlockchain
const BigNumber = require('bignumber.js')

describe("SolanaBlockchain.isTransactionValid", () => {
  const hwAddress = 'CQSE22PAUYdorqCLqAguCkjAvhSnCB2zXyNPTinWNG58'
  const solanaBlockchain = new SolanaBlockchain({
    figmentApiKey: "figmeent_project_id",
    blockchainNetwork: 'solana_devnet',
  })

  describe("for SPL token transfer", () => {
    const SplblockchainTransaction = require('./fixtures/solanaSplBlockchainTransaction').blockchainTransaction

    test('for valid blockchainTransaction', async () => {
      jest.spyOn(solanaBlockchain, "getTokenBalance").mockReturnValueOnce({ balance: new BigNumber("0.00000001"), balanceInBaseUnit: new BigNumber("10") })

      const validResults = await solanaBlockchain.isTransactionValid(SplblockchainTransaction, hwAddress)
      console.log(validResults);
      expect(validResults.valid).toBe(true)
      expect(validResults.markAs).toBe(undefined)
      expect(validResults.error).toBe(undefined)
      expect(validResults.switchHWToManualMode).toBe(undefined)
    })

    test('for incorrect txRaw', async () => {
      const bt = { ...SplblockchainTransaction }
      bt["txRaw"] = null

      const validResults = await solanaBlockchain.isTransactionValid(bt, hwAddress)
      expect(validResults.valid).toBe(false)
      expect(validResults.markAs).toBe(undefined)
      expect(validResults.error).toBe(undefined)
      expect(validResults.switchHWToManualMode).toBe(undefined)
    })

    test('for not enough tokens', async () => {
      jest.spyOn(solanaBlockchain, "getTokenBalance").mockReturnValueOnce({ balance: new BigNumber("0.0000000004"), balanceInBaseUnit: new BigNumber("4") })

      const validResults = await solanaBlockchain.isTransactionValid(SplblockchainTransaction, hwAddress)
      expect(validResults.valid).toBe(false)
      expect(validResults.markAs).toBe("cancelled")
      expect(validResults.error).toEqual("The Robo Wallet has insufficient tokens. Please top up the CQSE22PAUYdorqCLqAguCkjAvhSnCB2zXyNPTinWNG58")
      expect(validResults.switchHWToManualMode).toBe(true)
    })

    test('for unknown error', async () => {
      jest.spyOn(solanaBlockchain, "getTokenBalance").mockReturnValueOnce({})

      const validResults = await solanaBlockchain.isTransactionValid(SplblockchainTransaction, hwAddress)
      expect(validResults.valid).toBe(false)
      expect(validResults.markAs).toBe("failed")
      expect(validResults.error).toEqual("Unknown error: TypeError: Cannot read property 'isLessThan' of undefined")
      expect(validResults.switchHWToManualMode).toBe(true)
    })
  })

  describe("for SOL transfer", () => {
    const SolBlockchainTransaction = require('./fixtures/solanaSolBlockchainTransaction').blockchainTransaction

    test.only('for valid blockchainTransaction', async () => {
      jest.spyOn(solanaBlockchain, "getTokenBalance").mockReturnValueOnce({ balance: new BigNumber("0.00000001"), balanceInBaseUnit: new BigNumber("10") })

      const validResults = await solanaBlockchain.isTransactionValid(SolBlockchainTransaction, hwAddress)
      console.log(validResults);
      expect(validResults.valid).toBe(true)
      expect(validResults.markAs).toBe(undefined)
      expect(validResults.error).toBe(undefined)
      expect(validResults.switchHWToManualMode).toBe(undefined)
    })

    test('for incorrect txRaw', async () => {
      const bt = { ...SolBlockchainTransaction }
      bt["txRaw"] = null

      const validResults = await solanaBlockchain.isTransactionValid(bt, hwAddress)
      expect(validResults.valid).toBe(false)
      expect(validResults.markAs).toBe(undefined)
      expect(validResults.error).toBe(undefined)
      expect(validResults.switchHWToManualMode).toBe(undefined)
    })

    test('for not enough tokens', async () => {
      jest.spyOn(solanaBlockchain, "getSolBalance").mockReturnValueOnce({ sol: new BigNumber("0.000000004"), lamports: new BigNumber("4") })

      const validResults = await solanaBlockchain.isTransactionValid(SolBlockchainTransaction, hwAddress)
      expect(validResults.valid).toBe(false)
      expect(validResults.markAs).toBe("cancelled")
      expect(validResults.error).toEqual("The Robo Wallet has insufficient SOL balance. Please top up the CQSE22PAUYdorqCLqAguCkjAvhSnCB2zXyNPTinWNG58")
      expect(validResults.switchHWToManualMode).toBe(true)
    })

    test('for unknown error', async () => {
      jest.spyOn(solanaBlockchain, "getSolBalance").mockReturnValueOnce({})

      const validResults = await solanaBlockchain.isTransactionValid(SolBlockchainTransaction, hwAddress)
      expect(validResults.valid).toBe(false)
      expect(validResults.markAs).toBe("failed")
      expect(validResults.error).toEqual("Unknown error: TypeError: Cannot read property 'isLessThan' of undefined")
      expect(validResults.switchHWToManualMode).toBe(true)
    })
  })
});
